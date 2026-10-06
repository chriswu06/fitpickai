"use server";
import {requireUserId} from "@/app/lib/session";
import {fetchOotdCandidates} from "@/app/lib/data";
import {OUTFIT_SLOTS, OutfitSlotKey} from "@/app/lib/definitions";
import {describeDay, Forecast, GarmentTags} from "@/app/lib/garments";
import {Coordinates, fetchForecast, validCoordinates} from "@/app/lib/weather";
import {fetchCloset, fetchDescriptions, tagUntaggedGarments} from "@/app/lib/closet";
import {decide, Decision, Occasion} from "@/app/lib/verdict";
import {fetchGarmentFromLink, LinkError} from "@/app/lib/garment-link";
import {isUploadedFile, validateImage} from "@/app/lib/storage";
import {
    AiUnavailableError,
    ScannedGarment,
    classifyGarment,
    explainVerdict,
    imageBlockFromBytes,
    isSupportedImageType,
    pickOutfitOfTheDay,
    scanOutfitPhoto,
} from "@/app/lib/ai";

type Failure = {error: string};

function aiFailure(error: unknown, fallback: string): Failure {
    if (error instanceof AiUnavailableError || error instanceof LinkError) return {error: error.message};
    console.error(fallback, error);
    return {error: fallback};
}

// The forecast for the user's location; null when the location is missing or weather is unreachable.
export async function getForecast(coords: Coordinates | null): Promise<Forecast | null> {
    await requireUserId();
    return validCoordinates(coords) ? fetchForecast(coords) : null;
}

// =============================================================================
// Outfit of the day
// =============================================================================

const MAX_AI_CANDIDATES = 15;

export type AiPickResult = {outfitId: string; reason: string; error?: never} | {error: string; outfitId?: never; reason?: never};

// Asks Claude to choose today's outfit from the user's in-rotation outfits, given the weather.
export async function aiPickOutfit(note: string, recentIds: string[], coords: Coordinates | null): Promise<AiPickResult> {
    const outfits = await fetchOotdCandidates();
    if (outfits.length === 0) return {error: "You don't have any outfits in rotation."};
    const score = (o: (typeof outfits)[number]) => o.avg_friend_rating === null ? o.personal_rating : (o.personal_rating + o.avg_friend_rating) / 2;
    // Keep the request small: the best-rated outfits are the likeliest picks anyway.
    const top = [...outfits].sort((a, b) => score(b) - score(a)).slice(0, MAX_AI_CANDIDATES);
    const [descriptions, forecast] = await Promise.all([
        fetchDescriptions(top.flatMap(o => OUTFIT_SLOTS.map(s => o[s.column]).filter((u): u is string => !!u))),
        validCoordinates(coords) ? fetchForecast(coords, 1) : null,
    ]);
    const candidates = top.map(o => ({
        id: o.id,
        name: o.name,
        personalRating: o.personal_rating,
        friendRating: o.avg_friend_rating,
        imageUrls: OUTFIT_SLOTS.filter(s => o[s.column]).map(s => ({label: s.label, url: o[s.column]!, description: descriptions.get(o[s.column]!)})),
    }));
    const today = forecast?.days[0];
    try {
        return await pickOutfitOfTheDay(candidates, note.slice(0, 500), recentIds, today?.day ?? new Date().toISOString().slice(0, 10), today ? describeDay(today) : null);
    } catch (error) {
        return aiFailure(error, "FitPickAI couldn't pick an outfit right now.");
    }
}

// =============================================================================
// Adding clothes: scan a photo, or import a shop link
// =============================================================================

async function photoBlock(formData: FormData, field: string) {
    const file = formData.get(field);
    if (!isUploadedFile(file)) return {error: "Choose a photo first."};
    const problem = validateImage(file);
    if (problem) return {error: problem};
    if (!isSupportedImageType(file.type)) return {error: "Use a JPEG, PNG, WebP or GIF photo."};
    return {block: imageBlockFromBytes(Buffer.from(await file.arrayBuffer()), file.type)};
}

// Finds every garment in a photo of a whole outfit. The browser crops them out.
export async function scanOutfit(formData: FormData): Promise<{garments: ScannedGarment[]} | Failure> {
    await requireUserId();
    const photo = await photoBlock(formData, "photo");
    if ("error" in photo) return {error: photo.error!};
    try {
        const garments = await scanOutfitPhoto(photo.block);
        if (garments.length === 0) return {error: "Couldn't spot any clothes in that photo. Try one with better light, or the whole outfit in frame."};
        return {garments};
    } catch (error) {
        return aiFailure(error, "Couldn't scan that photo right now.");
    }
}

export type ImportedGarment = {slot: OutfitSlotKey; dataUrl: string; title: string | null; tags: GarmentTags};

// Pulls the product photo from a shop link and works out which slot it goes in.
export async function importGarmentLink(url: string): Promise<ImportedGarment | Failure> {
    await requireUserId();
    try {
        const linked = await fetchGarmentFromLink(url.trim());
        if (!isSupportedImageType(linked.contentType)) return {error: "That shop's image format isn't supported. Try another link."};
        const {slot, tags} = await classifyGarment(imageBlockFromBytes(linked.image, linked.contentType), linked.title);
        return {slot, title: linked.title, tags, dataUrl: `data:${linked.contentType};base64,${linked.image.toString("base64")}`};
    } catch (error) {
        return aiFailure(error, "Couldn't import that link right now.");
    }
}

// =============================================================================
// "Should I buy this?"
// =============================================================================

export type CheckResult = {
    decision: Decision;
    headline: string;
    explanation: string | null;
    reasons: string[];
    tags: GarmentTags;
    imageDataUrl: string | null;
    pairings: {url: string; description: string}[];
    duplicates: {url: string; description: string}[];
    closetSize: number;
    forecast: Forecast | null;
};

// Tags a garment from a photo or shop link, then runs the BUY / SKIP / TRY WITH rules against the
// user's closet, the week's weather and an optional occasion.
export async function checkGarment(formData: FormData): Promise<CheckResult | Failure> {
    const userId = await requireUserId();
    const link = String(formData.get("link") ?? "").trim();
    let coords: unknown = null;
    try {
        coords = JSON.parse(String(formData.get("coords") ?? "null"));
    } catch {
        // No location; carry on without weather.
    }
    const formality = Number(formData.get("occasionFormality") ?? 0);
    const occasionTitle = String(formData.get("occasionTitle") ?? "").trim().slice(0, 80) || "your plans this week";
    const occasions: Occasion[] = formality >= 1 && formality <= 5 ? [{title: occasionTitle, formality}] : [];

    try {
        let tags: GarmentTags;
        let imageDataUrl: string | null = null;
        if (link) {
            const linked = await fetchGarmentFromLink(link);
            if (!isSupportedImageType(linked.contentType)) return {error: "That shop's image format isn't supported. Try another link."};
            ({tags} = await classifyGarment(imageBlockFromBytes(linked.image, linked.contentType), linked.title));
            imageDataUrl = `data:${linked.contentType};base64,${linked.image.toString("base64")}`;
        } else {
            const photo = await photoBlock(formData, "photo");
            if ("error" in photo) return {error: photo.error!};
            ({tags} = await classifyGarment(photo.block, null));
        }

        // Make sure recent uploads are tagged before judging against the closet.
        await tagUntaggedGarments(userId, 24);
        const [closet, forecast] = await Promise.all([
            fetchCloset(userId),
            validCoordinates(coords) ? fetchForecast(coords) : null,
        ]);
        const days = forecast?.days ?? [];
        const verdict = decide(tags, closet, days, occasions, days[0]?.day ?? new Date().toISOString().slice(0, 10));
        const explanation = await explainVerdict(tags, verdict, days.map(d => `${d.day}: ${describeDay(d)}`)).catch(() => null);
        const toItem = (g: {id: string; tags: GarmentTags}) => ({url: g.id, description: g.tags.description});
        return {
            decision: verdict.decision,
            headline: verdict.headline,
            explanation,
            reasons: verdict.reasons.map(r => r.message),
            tags,
            imageDataUrl,
            pairings: verdict.pairings.slice(0, 6).map(toItem),
            duplicates: verdict.duplicates.slice(0, 6).map(toItem),
            closetSize: closet.length,
            forecast,
        };
    } catch (error) {
        return aiFailure(error, "Couldn't check that item right now.");
    }
}
