import {createClient} from "@supabase/supabase-js";

const BUCKET = "outfits";
const MAX_BYTES = 8 * 1024 * 1024;

const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {persistSession: false}}
);

let bucketReady: Promise<void> | null = null;

function ensureBucket() {
    bucketReady ??= (async () => {
        const {data} = await supabase.storage.getBucket(BUCKET);
        if (!data) {
            const {error} = await supabase.storage.createBucket(BUCKET, {public: true});
            if (error && !/already exists/i.test(error.message)) {
                bucketReady = null;
                throw error;
            }
        }
    })();
    return bucketReady;
}

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
    return value instanceof File && value.size > 0;
}

export function validateImage(file: File): string | null {
    if (!file.type.startsWith("image/")) return "File must be an image.";
    if (file.size > MAX_BYTES) return "Image must be 8MB or smaller.";
    return null;
}

// Uploads an image to Supabase Storage and returns its public URL.
export async function uploadOutfitImage(userId: string, slot: string, file: File): Promise<string> {
    await ensureBucket();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}-${slot}.${ext}`;
    const {error} = await supabase.storage.from(BUCKET).upload(path, file, {contentType: file.type});
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Best-effort cleanup of images we own. Ignores URLs that aren't in our bucket (e.g. seed data).
export async function deleteOutfitImages(urls: (string | null | undefined)[]) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const paths = urls
        .filter((u): u is string => !!u && u.includes(marker))
        .map((u) => decodeURIComponent(u.split(marker)[1]));
    if (paths.length === 0) return;
    const {error} = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.error("Failed to delete outfit images: ", error);
}
