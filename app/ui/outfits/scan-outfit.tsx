"use client";

import {useRef, useState} from "react";
import {CameraIcon, CheckIcon} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {OUTFIT_SLOTS, OutfitSlotKey} from "@/app/lib/definitions";
import {scanOutfit} from "@/app/lib/style-actions";
import {compressImage} from "@/app/ui/outfits/compress-image";
import {Box, canvasToFile, cropBox} from "@/app/ui/images/canvas";

// One piece the user chose to keep from a scan, cropped out of the photo.
export type ScannedPiece = {slot: OutfitSlotKey; file: File};

type Found = {slot: OutfitSlotKey; box: Box; description: string; file: File; url: string};

const labelFor = (slot: OutfitSlotKey) => OUTFIT_SLOTS.find(s => s.key === slot)?.label ?? slot;
const area = (b: Box) => (b.right - b.left) * (b.bottom - b.top);

// Scan one photo of a whole outfit, then pick which of the pieces found to add.
export default function ScanOutfit({onDone, onCancel}: {onDone: (pieces: ScannedPiece[]) => Promise<void>; onCancel: () => void}) {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [found, setFound] = useState<Found[] | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    const scan = async (file: File) => {
        setError(null);
        setFound(null);
        setSelected([]);
        setStatus("Looking for clothes in your photo...");
        try {
            const photo = await compressImage(file);
            setPhotoUrl(URL.createObjectURL(photo));
            const formData = new FormData();
            formData.set("photo", photo);
            const result = await scanOutfit(formData);
            if ("error" in result) {
                setError(result.error);
                return;
            }
            const pieces = await Promise.all(result.garments.map(async g => {
                const crop = await canvasToFile(await cropBox(photo, g.box), g.slot);
                return {slot: g.slot, box: g.box, description: g.tags.description, file: crop, url: URL.createObjectURL(crop)};
            }));
            setFound(pieces);
            // Start with the biggest piece per slot ticked (the main item, not a background one).
            const best = new Map<OutfitSlotKey, number>();
            pieces.forEach((p, i) => {
                const current = best.get(p.slot);
                if (current === undefined || area(p.box) > area(pieces[current].box)) best.set(p.slot, i);
            });
            setSelected([...best.values()]);
        } catch (e) {
            console.error(e);
            setError("Something went wrong. Try again.");
        } finally {
            setStatus(null);
        }
    };

    // An outfit has one photo per slot, so picking a piece drops any other one for the same slot.
    const toggle = (i: number) => {
        if (!found) return;
        setSelected(prev => prev.includes(i)
            ? prev.filter(j => j !== i)
            : [...prev.filter(j => found[j].slot !== found[i].slot), i]);
    };

    const add = async () => {
        if (!found) return;
        setStatus("Cutting out your pieces...");
        try {
            await onDone(selected.map(i => ({slot: found[i].slot, file: found[i].file})));
        } catch (e) {
            console.error(e);
            setError("Something went wrong. Try again.");
            setStatus(null);
        }
    };

    const busy = status !== null;

    return (
        <section>
            <h2 className="text-lg font-semibold">Scan a photo of your outfit</h2>
            <p className="mb-4 text-sm text-gray-600">
                We&apos;ll find each piece in it. You choose which ones to add.
            </p>
            <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Photo of your outfit"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) scan(file);
                }}
            />

            {!photoUrl ? (
                <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-pink-300 bg-white px-4 py-12 text-sm text-gray-600 transition-colors hover:border-pink-400 hover:bg-pink-50"
                >
                    <CameraIcon className="h-10 w-10 text-pink-500" />
                    <span className="font-medium text-gray-800">Choose or take a photo</span>
                    <span className="text-xs text-gray-500">A mirror selfie or clothes laid flat both work. Get the whole outfit in frame.</span>
                </button>
            ) : (
                <div className="flex flex-col gap-6 md:flex-row">
                    <div className="flex justify-center md:w-1/2">
                        <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
                            <img src={photoUrl} alt="Your outfit" className="block max-h-[28rem] w-auto rounded-lg" />
                            {found?.map((p, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggle(i)}
                                    aria-label={`${selected.includes(i) ? "Remove" : "Add"} ${p.description}`}
                                    className={clsx(
                                        "absolute rounded-md border-2 transition-colors",
                                        selected.includes(i) ? "border-pink-500 bg-pink-500/10" : "border-dashed border-white/80 hover:border-pink-300",
                                    )}
                                    style={{
                                        left: `${p.box.left * 100}%`,
                                        top: `${p.box.top * 100}%`,
                                        width: `${(p.box.right - p.box.left) * 100}%`,
                                        height: `${(p.box.bottom - p.box.top) * 100}%`,
                                    }}
                                >
                                    <span className={clsx(
                                        "absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                                        selected.includes(i) ? "bg-pink-500 text-white" : "bg-white text-gray-700",
                                    )}>
                                        {i + 1}
                                    </span>
                                </button>
                            ))}
                            {busy && (
                                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 px-4 text-center text-sm text-gray-700">
                                    {status}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col">
                        {found && (
                            <>
                                <p className="mb-2 text-sm font-medium">Found {found.length} {found.length === 1 ? "piece" : "pieces"}. Which ones should go in this outfit?</p>
                                <ul className="flex flex-col gap-2">
                                    {found.map((p, i) => (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => toggle(i)}
                                                disabled={busy}
                                                aria-pressed={selected.includes(i)}
                                                className={clsx(
                                                    "flex w-full items-center gap-3 rounded-lg border bg-white p-2 text-left transition-colors",
                                                    selected.includes(i) ? "border-pink-400 ring-1 ring-pink-400" : "border-gray-200 hover:border-gray-300",
                                                )}
                                            >
                                                <span className={clsx(
                                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                                    selected.includes(i) ? "border-pink-500 bg-pink-500 text-white" : "border-gray-300",
                                                )}>
                                                    {selected.includes(i) && <CheckIcon className="h-3.5 w-3.5" />}
                                                </span>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
                                                <img src={p.url} alt="" className="h-14 w-14 shrink-0 rounded bg-gray-50 object-contain" />
                                                <span className="min-w-0">
                                                    <span className="block text-xs font-medium uppercase tracking-wide text-gray-500">{i + 1} · {labelFor(p.slot)}</span>
                                                    <span className="block truncate text-sm">{p.description}</span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-xs text-gray-500">
                                    You&apos;ll check each piece next, and can add anything the scan missed.
                                </p>
                            </>
                        )}
                        <div aria-live="polite">
                            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => photoRef.current?.click()}
                                className="h-10 rounded-lg bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50"
                            >
                                Use another photo
                            </button>
                            {found && (
                                <button
                                    type="button"
                                    disabled={busy || selected.length === 0}
                                    onClick={add}
                                    className="h-10 rounded-lg bg-pink-500 px-4 text-sm font-medium text-white hover:bg-pink-400 disabled:opacity-50"
                                >
                                    Add {selected.length} {selected.length === 1 ? "piece" : "pieces"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <button type="button" onClick={onCancel} disabled={busy} className="mt-4 text-sm text-gray-500 underline-offset-2 hover:underline disabled:opacity-50">
                Back
            </button>
        </section>
    );
}
