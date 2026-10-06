import {sql} from "@/app/lib/db";
import {getCurrentUserId} from "@/app/lib/session";
import {renderTryOn, TryOnError, TryOnErrorCode} from "@/app/lib/tryon";

// The public Space can queue for minutes before it renders.
export const maxDuration = 300;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Leffa only does tops and bottoms; shoes and accessories aren't offered.
const REGION_COLUMNS = {
    upper: "shirt_image_url",
    lower: "pants_image_url",
} as const;

const ERROR_STATUS: Record<TryOnErrorCode, number> = {
    no_person: 422,
    quota: 429,
    busy: 503,
    timeout: 504,
    unavailable: 502,
};

// POST /api/try-on (multipart: person, garmentUrl, region): returns the render as image bytes.
// The person photo only lives in memory for this request; it is never stored (FitCheck ADR 0003).
export async function POST(request: Request) {
    const userId = await getCurrentUserId();
    if (!userId) return Response.json({error: "You must be logged in."}, {status: 401});

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return Response.json({error: "Send the photo as a form upload."}, {status: 400});
    }
    const person = form.get("person");
    const garmentUrl = form.get("garmentUrl");
    const region = form.get("region");
    if (!(person instanceof File) || person.size === 0 || !person.type.startsWith("image/")) {
        return Response.json({error: "Add a photo of yourself first."}, {status: 400});
    }
    if (person.size > MAX_PHOTO_BYTES) {
        return Response.json({error: "That photo is too large; try a smaller one."}, {status: 413});
    }
    if (region !== "upper" && region !== "lower") {
        return Response.json({error: "Pick a shirt or pants to try on."}, {status: 400});
    }
    if (typeof garmentUrl !== "string" || !garmentUrl) {
        return Response.json({error: "Pick a piece from your wardrobe."}, {status: 400});
    }

    // Only fetch URLs from the user's own outfits, so this can't be pointed at arbitrary hosts.
    const column = REGION_COLUMNS[region];
    const [owned] = await sql`
        SELECT 1 FROM outfits WHERE user_id = ${userId} AND ${sql(column)} = ${garmentUrl} LIMIT 1
    `;
    if (!owned) return Response.json({error: "That piece isn't in your wardrobe."}, {status: 404});

    let garment: Blob;
    try {
        const response = await fetch(garmentUrl, {signal: AbortSignal.timeout(30_000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        garment = await response.blob();
    } catch (error) {
        console.error("Try-on garment fetch error: ", error);
        return Response.json({error: "Couldn't load that piece's photo. Try another one."}, {status: 502});
    }

    try {
        const result = await renderTryOn({person, garment, region});
        return new Response(result.bytes, {
            headers: {"Content-Type": result.contentType, "Cache-Control": "no-store"},
        });
    } catch (error) {
        if (error instanceof TryOnError) {
            if (error.code === "unavailable") console.error("Try-on error: ", error.message);
            return Response.json({error: error.message, code: error.code}, {status: ERROR_STATUS[error.code]});
        }
        console.error("Try-on error: ", error);
        return Response.json({error: "Something went wrong rendering the try-on."}, {status: 500});
    }
}
