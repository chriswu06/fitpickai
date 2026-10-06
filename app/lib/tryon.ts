import "server-only";
import {Client} from "@gradio/client";

// Server-only: calls the public Leffa Space (MIT, huggingface.co/spaces/franciszzj/Leffa).
// Ported from FitCheck's hf_space.py. Person photos stay in memory only and are never persisted.

const SPACE = "franciszzj/Leffa";
const ENDPOINT = "/leffa_predict_vt";
// The Space's own defaults; 30 is also the lowest step count its UI allows.
const STEPS = 30;
const GUIDANCE = 2.5;
const SEED = 42;
// Leaves headroom under the route's 300s maxDuration for connecting and downloading.
const RENDER_TIMEOUT_MS = 270_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

export type TryOnRegion = "upper" | "lower" | "full";

// Leffa ships a VITON-HD model trained on tops and a DressCode model for bottoms and dresses.
const LEFFA_ARGS: Record<TryOnRegion, [string, string]> = {
    upper: ["viton_hd", "upper_body"],
    lower: ["dress_code", "lower_body"],
    full: ["dress_code", "dresses"],
};

export type TryOnErrorCode = "no_person" | "quota" | "busy" | "timeout" | "unavailable";

export class TryOnError extends Error {
    code: TryOnErrorCode;
    constructor(code: TryOnErrorCode, message: string) {
        super(message);
        this.code = code;
    }
}

export type TryOnResult = {bytes: ArrayBuffer; contentType: string};

export async function renderTryOn({person, garment, region}: {
    person: Blob;
    garment: Blob;
    region: TryOnRegion;
}): Promise<TryOnResult> {
    const token = process.env.HF_TOKEN as `hf_${string}` | undefined;
    let client: Client;
    try {
        // Without a token the call is anonymous and gets the smallest ZeroGPU allowance.
        client = await Client.connect(SPACE, token ? {token} : {});
    } catch (error) {
        throw new TryOnError("unavailable", `Couldn't reach the try-on service: ${messageOf(error)}`);
    }

    try {
        const [modelType, garmentType] = LEFFA_ARGS[region];
        const output = await runWithTimeout(client, [
            person, garment, false, STEPS, GUIDANCE, SEED, modelType, garmentType, false,
        ]);
        const generated = Array.isArray(output) ? output[0] : null;
        const url = generated && typeof generated === "object" ? (generated as {url?: unknown}).url : null;
        if (typeof url !== "string") {
            throw new TryOnError("unavailable", `The try-on service answered in an unexpected shape; check ${ENDPOINT} in its view_api().`);
        }
        return await download(url, token);
    } finally {
        client.close();
    }
}

// Like client.predict, but gives up (and frees the queue slot) after RENDER_TIMEOUT_MS.
async function runWithTimeout(client: Client, args: unknown[]): Promise<unknown> {
    // all_events: without it the iterator ends silently on a Space error instead of reporting it.
    const job = client.submit(ENDPOINT, args, undefined, null, true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            job.cancel().catch(() => {});
            reject(new TryOnError("timeout", "The try-on service took too long; its queue may be long. Try again in a few minutes."));
        }, RENDER_TIMEOUT_MS);
    });
    const run = (async () => {
        // "data" and "complete" can arrive in either order; stop once both are in.
        let data: unknown = null;
        let complete = false;
        for await (const message of job) {
            if (message.type === "data") {
                data = message.data;
            } else if (message.type === "status" && message.stage === "error") {
                const raw = message.message;
                const text = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : "";
                throw fromSpaceError(text, message.title ?? "");
            } else if (message.type === "status" && message.stage === "complete") {
                complete = true;
            }
            if (complete && data !== null) break;
        }
        if (data === null) throw new TryOnError("unavailable", "The try-on service ended without a result. Try again.");
        return data;
    })();
    try {
        return await Promise.race([run, timeout]);
    } finally {
        clearTimeout(timer);
    }
}

function fromSpaceError(message: string, title: string): TryOnError {
    // Each call reserves 180s of ZeroGPU time; anonymous callers (shared by server IP) get about one a day.
    if (`${title} ${message}`.toLowerCase().includes("quota")) {
        return new TryOnError("quota", `The free GPU quota on Hugging Face is used up for now. ${message}`);
    }
    // Leffa's pose and parsing steps index the first detected body; a photo with nobody in it fails there.
    if (message.trim() === "IndexError") {
        return new TryOnError("no_person", "No person was found in the photo. Use a full-body photo facing the camera.");
    }
    if (/queue|too many|busy|capacity/i.test(message)) {
        return new TryOnError("busy", `The try-on service is busy. ${message}`);
    }
    return new TryOnError("unavailable", `The try-on service failed: ${message || "unknown error"}`);
}

async function download(url: string, token: string | undefined): Promise<TryOnResult> {
    try {
        const response = await fetch(url, {
            headers: token ? {Authorization: `Bearer ${token}`} : {},
            signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get("content-type") ?? "image/webp";
        if (!contentType.startsWith("image/")) throw new Error(`not an image (${contentType})`);
        return {bytes: await response.arrayBuffer(), contentType};
    } catch (error) {
        throw new TryOnError("unavailable", `Couldn't download the render: ${messageOf(error)}`);
    }
}

function messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
