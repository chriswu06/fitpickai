"use client";

import {useEffect, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import {ArrowDownTrayIcon, CameraIcon, InformationCircleIcon, SparklesIcon} from "@heroicons/react/24/outline";
import {Button} from "@/app/ui/button";
import {compressImage} from "@/app/ui/outfits/compress-image";

export type TryOnGarment = {url: string; label: string; region: "upper" | "lower"};

const FRIENDLY_ERRORS: Record<string, string> = {
    no_person: "We couldn't find a person in that photo. Use a full-body photo of yourself facing the camera.",
    busy: "The try-on service is busy right now. Give it a minute and try again.",
    timeout: "The try-on service took too long, probably because its queue is long. Try again in a few minutes.",
    unavailable: "The try-on service isn't available right now. Try again later.",
};

function friendlyError(code: string | undefined, message: string | undefined) {
    if (code === "quota") {
        // The Space says when the free GPU allowance resets, e.g. "Try again in 23:59:04."
        const wait = message?.match(/Try again in ([\d:]+)/)?.[1];
        return `The free GPU allowance on Hugging Face is used up for now.${wait ? ` It resets in about ${wait.split(":")[0]}h.` : " Try again later."}`;
    }
    return (code && FRIENDLY_ERRORS[code]) || message || "Something went wrong. Try again.";
}

// Object URL for a blob that is revoked when it changes or the component unmounts.
function useObjectUrl(blob: Blob | null) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!blob) {
            setUrl(null);
            return;
        }
        const next = URL.createObjectURL(blob);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [blob]);
    return url;
}

function GarmentGroup({title, garments, selected, onSelect}: {
    title: string;
    garments: TryOnGarment[];
    selected: TryOnGarment | null;
    onSelect: (garment: TryOnGarment) => void;
}) {
    if (garments.length === 0) return null;
    return (
        <div>
            <p className="mb-2 text-sm font-medium">{title}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {garments.map(garment => (
                    <button
                        type="button"
                        key={garment.url}
                        onClick={() => onSelect(garment)}
                        aria-label={`Try on this ${garment.label.toLowerCase()}`}
                        aria-pressed={selected?.url === garment.url}
                        className={clsx(
                            "relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-2 transition",
                            selected?.url === garment.url ? "ring-pink-500" : "ring-transparent hover:ring-gray-300",
                        )}
                    >
                        <Image src={garment.url} alt={garment.label} fill sizes="96px" className="object-contain" />
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function TryOnStudio({garments}: {garments: TryOnGarment[]}) {
    const [photo, setPhoto] = useState<File | null>(null);
    const [garment, setGarment] = useState<TryOnGarment | null>(null);
    const [result, setResult] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const photoUrl = useObjectUrl(photo);
    const resultUrl = useObjectUrl(result);

    if (garments.length === 0) {
        return (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                Try-on works with the shirts and pants in your wardrobe.{" "}
                <Link href="/dashboard/outfits/create" className="text-blue-600 hover:underline">Add an outfit</Link>{" "}
                to get started.
            </div>
        );
    }

    const choosePhoto = async (file: File | undefined) => {
        setError(null);
        setResult(null);
        // Keep it at most 1280px so the upload stays small; Leffa works at 768x1024 anyway.
        setPhoto(file ? await compressImage(file) : null);
    };

    const render = async () => {
        if (!photo || !garment) return;
        setError(null);
        setResult(null);
        setIsRendering(true);
        try {
            const body = new FormData();
            body.set("person", photo);
            body.set("garmentUrl", garment.url);
            body.set("region", garment.region);
            const response = await fetch("/api/try-on", {method: "POST", body});
            if (response.ok) {
                setResult(await response.blob());
            } else {
                // A platform timeout (e.g. Vercel's 504) comes back as HTML, not our JSON.
                const data = await response.json().catch(() => null) as {error?: string; code?: string} | null;
                setError(data ? friendlyError(data.code, data.error) : friendlyError(response.status === 504 ? "timeout" : "unavailable", undefined));
            }
        } catch {
            setError("Couldn't reach FitPickAI. Check your connection and try again.");
        } finally {
            setIsRendering(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div className="flex gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                <InformationCircleIcon className="h-5 w-5 shrink-0" />
                <p>
                    Your photo is sent to a public Hugging Face Space (Leffa) to render the try-on. FitPickAI never saves
                    it, though the Space may keep its copy briefly while it works.
                </p>
            </div>

            <section className="rounded-xl bg-gray-50 p-4">
                <label htmlFor="try-on-photo" className="mb-2 block text-sm font-medium">1. Your photo</label>
                <p className="mb-3 text-xs text-gray-500">Full body, facing the camera, plain background works best.</p>
                <label
                    htmlFor="try-on-photo"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600 hover:border-gray-400"
                >
                    <CameraIcon className="h-5 w-5" />
                    {photo ? "Choose a different photo" : "Take or upload a photo"}
                </label>
                <input
                    id="try-on-photo"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isRendering}
                    onChange={(e) => choosePhoto(e.target.files?.[0])}
                />
            </section>

            <section className="flex flex-col gap-4 rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-medium">2. Pick a piece</p>
                <GarmentGroup title="Shirts" garments={garments.filter(g => g.region === "upper")} selected={garment} onSelect={setGarment} />
                <GarmentGroup title="Pants / shorts" garments={garments.filter(g => g.region === "lower")} selected={garment} onSelect={setGarment} />
            </section>

            <div className="flex flex-col items-center gap-2">
                <Button
                    type="button"
                    onClick={render}
                    disabled={!photo || !garment || isRendering}
                    aria-disabled={!photo || !garment || isRendering}
                    className="bg-pink-500 hover:bg-pink-400 active:bg-pink-600"
                >
                    <SparklesIcon className="mr-2 h-5 w-5" />
                    {isRendering ? "Rendering..." : "Render try-on"}
                </Button>
                {isRendering && <p className="text-xs text-gray-500" aria-live="polite">This can take a minute or two.</p>}
                {error && <p className="text-center text-sm text-red-500" aria-live="polite">{error}</p>}
            </div>

            {photoUrl && (
                <div className="grid grid-cols-2 gap-3">
                    <figure className="flex flex-col gap-1">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
                            <Image src={photoUrl} alt="Your photo" fill unoptimized className="object-contain" />
                        </div>
                        <figcaption className="text-center text-xs text-gray-500">Original</figcaption>
                    </figure>
                    <figure className="flex flex-col gap-1">
                        <div className={clsx("relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100", isRendering && "animate-pulse")}>
                            {resultUrl ? (
                                <Image src={resultUrl} alt="You wearing the chosen piece" fill unoptimized className="object-contain" />
                            ) : (
                                <span className="flex h-full items-center justify-center p-4 text-center text-xs text-gray-400">
                                    {isRendering ? "Rendering..." : "Your try-on shows up here"}
                                </span>
                            )}
                        </div>
                        <figcaption className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            Try-on
                            {resultUrl && (
                                <a href={resultUrl} download={`fitpickai-try-on.${result?.type.split("/")[1] || "webp"}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                    <ArrowDownTrayIcon className="h-4 w-4" /> Save
                                </a>
                            )}
                        </figcaption>
                    </figure>
                </div>
            )}
        </div>
    );
}
