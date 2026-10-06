import "server-only";
import {sql} from "@/app/lib/db";
import {OUTFIT_SLOTS} from "@/app/lib/definitions";
import {ClosetGarment, GarmentTags} from "@/app/lib/garments";
import {imageBlockFromUrl, tagGarment, AiUnavailableError} from "@/app/lib/ai";

// Every distinct image URL in the user's outfits, with how many outfits use it.
function closetImages(userId: string) {
    const columns = OUTFIT_SLOTS.map(s => sql`(${sql(s.column)})`);
    const unnested = columns.reduce((acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`));
    return sql<{url: string; wears: number}[]>`
        SELECT url, COUNT(*)::int AS wears
        FROM outfits, LATERAL (VALUES ${unnested}) AS v(url)
        WHERE outfits.user_id = ${userId} AND url IS NOT NULL AND url <> ''
        GROUP BY url
    `;
}

// Tags up to `limit` of the user's untagged photos with the AI. Returns how many it tagged.
// Called after outfits are saved (via `after()`) so the user never waits on it.
export async function tagUntaggedGarments(userId: string, limit = 12) {
    const images = await closetImages(userId);
    const tagged = new Set((await sql<{image_url: string}[]>`SELECT image_url FROM garment_tags WHERE user_id = ${userId}`).map(r => r.image_url));
    const todo = images.filter(i => !tagged.has(i.url)).slice(0, limit);
    let count = 0;
    // A few at a time: fast enough, without tripping rate limits.
    for (let i = 0; i < todo.length; i += 4) {
        const results = await Promise.all(todo.slice(i, i + 4).map(async ({url}) => {
            const image = await imageBlockFromUrl(url);
            if (!image) return false;
            try {
                await saveTags(userId, url, await tagGarment(image));
                return true;
            } catch (error) {
                if (error instanceof AiUnavailableError) return false;
                console.error("Tagging Error: ", error);
                return false;
            }
        }));
        count += results.filter(Boolean).length;
    }
    return count;
}

export async function saveTags(userId: string, imageUrl: string, tags: GarmentTags) {
    await sql`
        INSERT INTO garment_tags (image_url, user_id, category, color_family, pattern, warmth, waterproof, formality, description)
        VALUES (${imageUrl}, ${userId}, ${tags.category}, ${tags.color_family}, ${tags.pattern}, ${tags.warmth}, ${tags.waterproof}, ${tags.formality}, ${tags.description.slice(0, 120)})
        ON CONFLICT (image_url) DO UPDATE SET
            category = EXCLUDED.category, color_family = EXCLUDED.color_family, pattern = EXCLUDED.pattern,
            warmth = EXCLUDED.warmth, waterproof = EXCLUDED.waterproof, formality = EXCLUDED.formality,
            description = EXCLUDED.description, tagged_at = now()
        WHERE garment_tags.user_id = EXCLUDED.user_id
    `;
}

// The user's tagged garments, most-worn first. Untagged photos are left out.
export async function fetchCloset(userId: string): Promise<ClosetGarment[]> {
    const [images, tags] = await Promise.all([
        closetImages(userId),
        sql<(GarmentTags & {image_url: string})[]>`
            SELECT image_url, category, color_family, pattern, warmth, waterproof, formality, description
            FROM garment_tags WHERE user_id = ${userId}
        `,
    ]);
    const byUrl = new Map(tags.map(({image_url, ...t}) => [image_url, t as GarmentTags]));
    return images
        .filter(i => byUrl.has(i.url))
        .sort((a, b) => b.wears - a.wears)
        .map(i => ({id: i.url, tags: byUrl.get(i.url)!, wears: i.wears}));
}

// Descriptions for specific photos, for prompts and shop searches.
export async function fetchDescriptions(urls: string[]) {
    if (urls.length === 0) return new Map<string, string>();
    const rows = await sql<{image_url: string; description: string}[]>`
        SELECT image_url, description FROM garment_tags WHERE image_url = ANY(${urls}::text[])
    `;
    return new Map(rows.map(r => [r.image_url, r.description]));
}
