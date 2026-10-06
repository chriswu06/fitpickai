import "server-only";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";

// Turns a pasted shop link into a garment photo: either a direct image URL or a product page,
// where the image comes from og:image, twitter:image, JSON-LD `image` or the first <img>.
// Ported from FitCheck (github.com/HackedRico/FitCheck, Apache-2.0), engine/src/fitcheck/garment_link.py.
// Every hop is checked so a link can't reach private network addresses from our server.

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export class LinkError extends Error {}

export type LinkedGarment = {image: Buffer; contentType: string; sourceUrl: string; title: string | null};

export async function fetchGarmentFromLink(url: string): Promise<LinkedGarment> {
    const page = await get(url);
    if (page.contentType.startsWith("image/")) {
        return {image: page.body, contentType: page.contentType, sourceUrl: page.url, title: null};
    }
    if (!page.contentType.includes("html")) {
        throw new LinkError(`That link is a ${page.contentType || "file"}, not a page or an image.`);
    }
    const html = page.body.toString("utf8");
    const imageUrl = findImage(html);
    if (!imageUrl) throw new LinkError("Found no product image on that page. Paste the image's own link instead.");
    const image = await get(new URL(imageUrl, page.url).toString());
    if (!image.contentType.startsWith("image/")) throw new LinkError("The page's image link didn't return an image.");
    return {image: image.body, contentType: image.contentType, sourceUrl: page.url, title: findTitle(html)};
}

// GET `url`, following redirects by hand so each hop passes the private-network check.
async function get(url: string) {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await requirePublicUrl(url);
        let res: Response;
        try {
            res = await fetch(url, {
                redirect: "manual",
                headers: {"User-Agent": USER_AGENT, Accept: "text/html,image/*;q=0.9,*/*;q=0.5"},
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch {
            throw new LinkError("Couldn't load that link.");
        }
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get("location");
            if (!location) throw new LinkError("The link redirected nowhere.");
            url = new URL(location, url).toString();
            continue;
        }
        if (res.status >= 400) {
            throw new LinkError(`The shop answered ${res.status}; it may block apps. Open the product image and paste its link instead.`);
        }
        const contentType = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
        return {url, contentType, body: await readCapped(res)};
    }
    throw new LinkError("The link redirected too many times.");
}

async function readCapped(res: Response) {
    const reader = res.body?.getReader();
    if (!reader) return Buffer.alloc(0);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
            await reader.cancel();
            throw new LinkError("The linked file is over 8 MB.");
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

// Rejects anything but http(s) to a public address, so a link can't probe our network.
async function requirePublicUrl(url: string) {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new LinkError("Paste a full link starting with https://.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new LinkError("Paste a full link starting with https://.");
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    let addresses: string[];
    try {
        addresses = isIP(host) ? [host] : (await lookup(host, {all: true})).map(a => a.address);
    } catch {
        throw new LinkError(`Couldn't find ${host}; check the link.`);
    }
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
        throw new LinkError("That link points at a private network address.");
    }
}

function isPrivateAddress(address: string): boolean {
    const ip = address.toLowerCase();
    // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (isIP(ip) === 4) {
        const [a, b] = ip.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8")
        || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("ff");
}

// Image hints in order of trust: Open Graph, Twitter card, JSON-LD, then the first <img>.
function findImage(html: string): string | null {
    for (const key of ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]) {
        const value = metaContent(html, key);
        if (value) return value;
    }
    for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        const found = ldImage(block[1]);
        if (found) return found;
    }
    const img = html.match(/<img\b[^>]*?\s(?:src|data-src)=["']([^"']+)["']/i);
    return img ? decodeEntities(img[1]) : null;
}

function findTitle(html: string): string | null {
    const title = metaContent(html, "og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    return title ? decodeEntities(title).slice(0, 120) : null;
}

function metaContent(html: string, key: string): string | null {
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = tag[0];
        const name = attrs.match(/\s(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
        if (name !== key) continue;
        const content = attrs.match(/\scontent=["']([^"']*)["']/i)?.[1];
        if (content) return decodeEntities(content);
    }
    return null;
}

function ldImage(raw: string): string | null {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    const stack = [data];
    while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) stack.push(...node);
        else if (node && typeof node === "object") {
            const image = (node as Record<string, unknown>).image;
            if (typeof image === "string") return image;
            if (Array.isArray(image) && typeof image[0] === "string") return image[0];
            if (image && typeof image === "object" && typeof (image as {url?: unknown}).url === "string") return (image as {url: string}).url;
            stack.push(...Object.values(node as Record<string, unknown>));
        }
    }
    return null;
}

function decodeEntities(text: string) {
    return text.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
