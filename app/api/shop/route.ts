import {NextRequest} from "next/server";
import {sql} from "@/app/lib/db";
import {getCurrentUserId} from "@/app/lib/session";
import {OUTFIT_SLOTS} from "@/app/lib/definitions";
import {shoppingQuery, AiUnavailableError} from "@/app/lib/ai";
import {fetchDescriptions} from "@/app/lib/closet";

// Image URL -> search query. Item photos never change in place (edits upload a new file), so this never goes stale.
const queryCache = new Map<string, string>();

function amazonSearchUrl(query: string) {
    const url = new URL("https://www.amazon.com/s");
    url.searchParams.set("k", query);
    // Amazon Associates tag, if you have one, so purchases earn a commission.
    if (process.env.AMAZON_ASSOCIATE_TAG) url.searchParams.set("tag", process.env.AMAZON_ASSOCIATE_TAG);
    return url.toString();
}

// GET /api/shop?outfit=<id>&slot=<column>: redirects to an Amazon search for items like that piece of clothing.
export async function GET(request: NextRequest) {
    if (!(await getCurrentUserId())) {
        return Response.json({error: "You must be logged in."}, {status: 401});
    }
    const outfitId = request.nextUrl.searchParams.get("outfit") ?? "";
    const slot = OUTFIT_SLOTS.find(s => s.column === request.nextUrl.searchParams.get("slot"));
    if (!slot) return Response.json({error: "Unknown clothing slot."}, {status: 400});

    let imageUrl: string | null = null;
    try {
        const [row] = await sql`SELECT ${sql(slot.column)} AS url FROM outfits WHERE id = ${outfitId}`;
        imageUrl = row?.url || null;
    } catch {
        // Invalid UUID; treat as not found.
    }
    if (!imageUrl) return Response.json({error: "Item not found."}, {status: 404});

    // A garment that's already been tagged has a ready-made description.
    let query = queryCache.get(imageUrl) ?? (await fetchDescriptions([imageUrl])).get(imageUrl);
    if (!query) {
        try {
            query = (await shoppingQuery(imageUrl, slot.label)) ?? undefined;
        } catch (error) {
            if (!(error instanceof AiUnavailableError)) console.error("Shopping query error: ", error);
        }
        if (query) queryCache.set(imageUrl, query);
    }
    // Without AI, fall back to a generic search for the item type.
    return Response.redirect(amazonSearchUrl(query ?? slot.label), 302);
}
