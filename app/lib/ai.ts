import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {betaZodOutputFormat} from "@anthropic-ai/sdk/helpers/beta/zod";
import {z} from "zod/v4";
import {CATEGORIES, COLOR_FAMILIES, GarmentTags, GarmentTagsSchema, PATTERNS} from "@/app/lib/garments";
import {OUTFIT_SLOTS, OutfitSlotKey} from "@/app/lib/definitions";
import type {Verdict} from "@/app/lib/verdict";

const MODEL = "claude-opus-5-5";
// Re-run a request on another model if the first one declines it.
const FALLBACK = {betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
type ImageBlock = Anthropic.Beta.BetaImageBlockParam;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export class AiUnavailableError extends Error {}

// Turns SDK failures into one error type the UI can explain.
function wrapError(error: unknown): never {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof Anthropic.AuthenticationError || (error instanceof Error && /api key|credentials/i.test(error.message))) {
        throw new AiUnavailableError("AI features aren't set up: add ANTHROPIC_API_KEY to .env.");
    }
    if (error instanceof Anthropic.RateLimitError) {
        throw new AiUnavailableError("FitPickAI is busy right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.APIError) {
        console.error(`Claude API error ${error.status}: `, error.message);
        throw new AiUnavailableError("FitPickAI couldn't reach the AI service.");
    }
    throw error;
}

export function isSupportedImageType(type: string): type is ImageType {
    return IMAGE_TYPES.includes(type as ImageType);
}

export function imageBlockFromBytes(data: Buffer, type: ImageType): ImageBlock {
    return {type: "image", source: {type: "base64", media_type: type, data: data.toString("base64")}};
}

// Downloads an image and returns it as a base64 image block. Images are fetched here rather than
// passed by URL so one unreachable or unsupported image is skipped instead of failing the whole request.
export async function imageBlockFromUrl(url: string): Promise<ImageBlock | null> {
    try {
        const res = await fetch(url, {signal: AbortSignal.timeout(8000)});
        if (!res.ok) return null;
        const type = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
        if (!isSupportedImageType(type)) return null;
        const data = Buffer.from(await res.arrayBuffer());
        if (data.length > 4 * 1024 * 1024) return null;
        return imageBlockFromBytes(data, type);
    } catch {
        return null;
    }
}

// Structured-output call shared by every feature below.
async function ask<T extends z.ZodType>(schema: T, params: {
    system?: string;
    content: Anthropic.Beta.BetaContentBlockParam[];
    effort: "low" | "medium" | "high";
    maxTokens?: number;
}): Promise<z.infer<T>> {
    try {
        const response = await getClient().beta.messages.parse({
            model: MODEL,
            max_tokens: params.maxTokens ?? 16000,
            output_config: {effort: params.effort, format: betaZodOutputFormat(schema)},
            ...(params.system ? {system: params.system} : {}),
            messages: [{role: "user", content: params.content}],
            ...FALLBACK,
        });
        if (response.stop_reason === "refusal" || response.parsed_output == null) {
            throw new AiUnavailableError("FitPickAI couldn't read that one. Try a different photo.");
        }
        return response.parsed_output as z.infer<T>;
    } catch (error) {
        wrapError(error);
    }
}

// =============================================================================
// Garment tagging and closet scans (prompts from FitCheck, Apache-2.0:
// github.com/HackedRico/FitCheck, engine/src/fitcheck/vision/prompts.py)
// =============================================================================

// The allowed values sit in the prompt as well as the schema: a model that has read the options
// picks the right one more often.
const TAGGING_RULES =
    "Return these fields:\n" +
    `- category: one of ${CATEGORIES.join(", ")}. shirt is collared or buttoned, sweater is knitwear, ` +
    "outerwear is any coat or jacket, top is everything else worn on the upper body.\n" +
    `- color_family: one of ${COLOR_FAMILIES.join(", ")}. Use multi only when no one color covers most of the garment.\n` +
    `- pattern: one of ${PATTERNS.join(", ")}.\n` +
    "- warmth: 1 = summer tee, 5 = winter parka.\n" +
    "- waterproof: true only for coated or shell fabrics.\n" +
    "- formality: 1 = gym, 5 = black tie.\n" +
    "- description: at most 12 words, such as 'navy wool crew-neck sweater'.\n" +
    "If unsure, choose the more conservative value.";

const TAGGING_PROMPT =
    "You tag one garment for a wardrobe app. Look only at the garment; ignore the hanger, the person and the background.\n" +
    TAGGING_RULES;

export async function tagGarment(image: ImageBlock): Promise<GarmentTags> {
    return ask(GarmentTagsSchema, {content: [image, {type: "text", text: TAGGING_PROMPT}], effort: "low", maxTokens: 4000});
}

const SLOT_KEYS = OUTFIT_SLOTS.map(s => s.key) as [OutfitSlotKey, ...OutfitSlotKey[]];

const ScanSchema = z.object({
    garments: z.array(z.object({
        slot: z.enum(SLOT_KEYS),
        // [x1, y1, x2, y2] from 0 to 1000 of the image width and height.
        box: z.array(z.number()),
        tags: GarmentTagsSchema,
    })),
});

export type ScannedGarment = {
    slot: OutfitSlotKey;
    // Fractions of the image width and height, top-left origin.
    box: {left: number; top: number; right: number; bottom: number};
    tags: GarmentTags;
};

const SCAN_PROMPT =
    "This photo shows an outfit: worn by a person, laid out flat, or hanging. " +
    "Find every separate garment and accessory you can see clearly, up to 12. Skip hangers, furniture and items mostly hidden.\n" +
    "For each, give:\n" +
    `- slot: where it goes in the app. ${OUTFIT_SLOTS.map(s => `${s.key} = ${s.label}`).join("; ")}. ` +
    "Jackets, sweaters, shirts, tops and dresses all go in shirtImageUrl.\n" +
    "- box: its bounding box as [x1, y1, x2, y2] in coordinates from 0 to 1000 of the image width and height. Box the garment tightly.\n" +
    "- tags, by these rules:\n" + TAGGING_RULES;

// Finds each garment in one photo of a whole outfit, with where it is.
export async function scanOutfitPhoto(image: ImageBlock): Promise<ScannedGarment[]> {
    const result = await ask(ScanSchema, {content: [image, {type: "text", text: SCAN_PROMPT}], effort: "medium"});
    return result.garments.flatMap(g => {
        const box = toBox(g.box);
        return box ? [{slot: g.slot, box, tags: g.tags}] : [];
    });
}

const ClassifySchema = z.object({
    is_clothing: z.boolean().describe("False when the photo shows no clothing item, e.g. a logo, a bot-check page or a room."),
    slot: z.enum(SLOT_KEYS),
    tags: GarmentTagsSchema,
});

// Tags the main product in a shop photo and says which outfit slot it belongs in.
export async function classifyGarment(image: ImageBlock, title: string | null) {
    const text =
        "This is a product photo from a clothing shop" + (title ? ` titled "${title}"` : "") + ". " +
        "Look only at the product being sold, not other clothes the model wears.\n" +
        "- is_clothing: false if the photo shows no clothing item at all.\n" +
        `- slot: where it goes in the app. ${OUTFIT_SLOTS.map(s => `${s.key} = ${s.label}`).join("; ")}. ` +
        "Jackets, sweaters, shirts, tops and dresses all go in shirtImageUrl.\n" +
        "- tags, by these rules:\n" + TAGGING_RULES;
    const result = await ask(ClassifySchema, {content: [image, {type: "text", text}], effort: "low", maxTokens: 4000});
    if (!result.is_clothing) {
        throw new AiUnavailableError("That doesn't look like a clothing photo. If it's a shop link, the shop may block apps: open the product image and paste its link instead.");
    }
    return {slot: result.slot, tags: result.tags};
}

function toBox(raw: number[]) {
    if (raw.length !== 4 || raw.some(v => !Number.isFinite(v))) return null;
    const [x1, y1, x2, y2] = raw.map(v => Math.min(Math.max(v / 1000, 0), 1));
    const [left, right] = [Math.min(x1, x2), Math.max(x1, x2)];
    const [top, bottom] = [Math.min(y1, y2), Math.max(y1, y2)];
    // A sliver this thin is a hanger or a model glitch, not a garment.
    if (right - left < 0.03 || bottom - top < 0.03) return null;
    return {left, top, right, bottom};
}

// =============================================================================
// Outfit of the day
// =============================================================================

export type PickCandidate = {
    id: string;
    name: string | null;
    personalRating: number;
    friendRating: number | null;
    imageUrls: {label: string; url: string; description?: string}[];
};

const PickSchema = z.object({
    outfit_number: z.number().int().describe("The number of the chosen outfit, as labelled in the message."),
    reason: z.string().describe("One or two friendly sentences, addressed to the user, on why this outfit fits today."),
});

const PICK_SYSTEM = `You are FitPickAI, a personal stylist choosing the user's outfit of the day from clothes they already own.
Look at the photos of each outfit. Weigh, in this order: the weather and what the user says about their day (occasion, mood), how well the pieces go together, and the ratings (the user's own 0-10 rating and their friends' average).
Prefer outfits the user hasn't picked recently. Every candidate is already in rotation, so any of them is a valid answer.`;

export async function pickOutfitOfTheDay(candidates: PickCandidate[], note: string, recentIds: string[], date: string, weather: string | null) {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    const blocks = await Promise.all(candidates.map(c => Promise.all(c.imageUrls.map(i => imageBlockFromUrl(i.url)))));
    candidates.forEach((c, i) => {
        const ratings = [`your rating ${c.personalRating}/10`, c.friendRating === null ? "no friend ratings" : `friends' average ${c.friendRating.toFixed(1)}/10`];
        if (recentIds.includes(c.id)) ratings.push("picked in the last week");
        content.push({type: "text", text: `Outfit ${i + 1}: "${c.name ?? "Untitled"}" (${ratings.join(", ")})`});
        c.imageUrls.forEach((img, j) => {
            const block = blocks[i][j];
            if (block) {
                content.push({type: "text", text: img.description ? `${img.label}: ${img.description}` : img.label});
                content.push(block);
            }
        });
    });
    const day = [
        `Today is ${date}.`,
        weather ? `Weather today: ${weather}.` : "I don't know today's weather.",
        note.trim() ? `About my day: ${note.trim()}` : "I didn't say anything about my day.",
    ];
    content.push({type: "text", text: `${day.join("\n")}\nPick one outfit for me.`});

    const pick = await ask(PickSchema, {system: PICK_SYSTEM, content, effort: "medium"});
    const chosen = candidates[pick.outfit_number - 1];
    if (!chosen) throw new AiUnavailableError("FitPickAI couldn't decide this time.");
    return {outfitId: chosen.id, reason: pick.reason};
}

// =============================================================================
// "Should I buy this?" explanation (stylist prompt adapted from FitCheck)
// =============================================================================

const STYLIST_SYSTEM = `You are FitPickAI, a blunt but kind second opinion while the user shops.
You receive FACTS: the garment's tags, the verdict and its reasons, and the week's forecast.
State the verdict in your first sentence, then give at most two reasons, using the FACTS only. Never invent closet items, prices or weather. The verdict is final: explain it, never change it. Keep it under 60 words.`;

const ExplainSchema = z.object({text: z.string()});

export async function explainVerdict(candidate: GarmentTags, verdict: Verdict, forecastLines: string[]) {
    const facts = [
        "FACTS",
        `Garment: ${candidate.description} (${candidate.category}, ${candidate.color_family}, ${candidate.pattern}, warmth ${candidate.warmth}/5, formality ${candidate.formality}/5${candidate.waterproof ? ", waterproof" : ""})`,
        `Verdict: ${verdict.decision.toUpperCase()}. ${verdict.headline}`,
        ...verdict.reasons.map(r => `Reason: ${r.message}`),
        ...(verdict.best_pairing ? [`Best pairing: ${verdict.best_pairing.tags.description}`] : []),
        ...forecastLines.map(l => `Forecast ${l}`),
    ];
    const result = await ask(ExplainSchema, {system: STYLIST_SYSTEM, content: [{type: "text", text: facts.join("\n")}], effort: "low", maxTokens: 4000});
    return result.text;
}

// =============================================================================
// Shopping
// =============================================================================

const ShopSchema = z.object({
    query: z.string().describe("A short Amazon search query (3-8 words) for this clothing item: colour, material, style and item type."),
});

// Describes one clothing photo as a shopping search query.
export async function shoppingQuery(imageUrl: string, label: string) {
    const image = await imageBlockFromUrl(imageUrl);
    if (!image) return null;
    const result = await ask(ShopSchema, {
        content: [image, {type: "text", text: `This is a photo of my ${label.toLowerCase()}. Write the Amazon search I should run to buy something similar.`}],
        effort: "low",
        maxTokens: 2000,
    });
    return result.query.trim() || null;
}
