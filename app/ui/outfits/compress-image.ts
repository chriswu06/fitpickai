const MAX_DIMENSION = 1280;
const QUALITY = 0.85;

// Downscales an image in the browser so uploads stay small (phone photos are often 5-10MB).
// Falls back to the original file if anything goes wrong.
export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        // WebP keeps transparency (useful for cut-out clothing photos) and is smaller than PNG.
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", QUALITY));
        if (!blob || blob.size >= file.size) return file;
        const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
        return new File([blob], name, {type: "image/webp"});
    } catch {
        return file;
    }
}
