"use client";

import {useState} from "react";
import {LinkIcon, PhotoIcon, TrashIcon} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {OUTFIT_SLOTS, OutfitSlot} from "@/app/lib/definitions";
import {importGarmentLink} from "@/app/lib/style-actions";
import {removeBackground} from "@/app/ui/images/cutout";

// One slot of the outfit, on its own: upload a photo or paste a shop link for it.
export default function PiecePicker({slot, url, error, clean, onCleanChange, onPick, onRemove}: {
    slot: OutfitSlot;
    url: string | null;
    error?: string[];
    clean: boolean;
    onCleanChange: (clean: boolean) => void;
    onPick: (file: File) => void;
    onRemove?: () => void;
}) {
    const [status, setStatus] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [link, setLink] = useState("");
    const busy = status !== null;
    const noun = slot.label.toLowerCase();

    const run = async (message: string, work: () => Promise<void>) => {
        setStatus(message);
        setProblem(null);
        setNotice(null);
        try {
            await work();
        } catch (e) {
            console.error(e);
            setProblem("Something went wrong. Try again.");
        } finally {
            setStatus(null);
        }
    };

    const upload = (file: File) => run(clean ? "Removing background..." : "Adding photo...", async () => {
        onPick(clean ? await removeBackground(file, slot.key) : file);
    });

    const importLink = () => run("Fetching the product photo...", async () => {
        const result = await importGarmentLink(link);
        if ("error" in result) {
            setProblem(result.error);
            return;
        }
        const blob = await (await fetch(result.dataUrl)).blob();
        const file = new File([blob], `${slot.key}.${blob.type.split("/")[1] ?? "jpg"}`, {type: blob.type});
        onPick(clean ? await removeBackground(file, slot.key) : file);
        setLink("");
        if (result.slot !== slot.key) {
            const looksLike = OUTFIT_SLOTS.find(s => s.key === result.slot)?.label.toLowerCase();
            setNotice(`That looks more like a ${looksLike}, but it's been added as your ${noun}.`);
        }
    });

    return (
        <section>
            <h2 className="text-lg font-semibold">{url ? `Your ${noun}` : `Add your ${noun}`}</h2>
            <p className="mb-4 text-sm text-gray-600">
                {url ? "Looks right? Carry on. Otherwise tap the photo to swap it." : "Upload a photo of it, or paste a link to it from a shop."}
            </p>

            <div className="mx-auto max-w-xs">
                <label
                    className={clsx(
                        "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white text-sm text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50",
                        error?.length ? "border-red-400" : "border-gray-300",
                    )}
                >
                    {busy && (
                        <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-gray-600">{status}</span>
                    )}
                    {url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob: or storage URL
                        <img src={url} alt={`Your ${noun}`} className="h-full w-full object-contain p-2" />
                    ) : (
                        <>
                            <PhotoIcon className="h-10 w-10" />
                            <span className="mt-2 font-medium">Choose or take a photo</span>
                        </>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) upload(file);
                        }}
                    />
                </label>

                <div className="mt-3 flex gap-2">
                    <label htmlFor={`${slot.key}-link`} className="sr-only">Shop link</label>
                    <div className="relative flex-1">
                        <LinkIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            id={`${slot.key}-link`}
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (!busy && link.trim()) importLink();
                                }
                            }}
                            placeholder="Or paste a shop link"
                            className="h-10 w-full rounded-lg border border-gray-200 pl-8 pr-2 text-sm placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        type="button"
                        disabled={busy || !link.trim()}
                        onClick={importLink}
                        className="h-10 rounded-lg bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={clean} onChange={(e) => onCleanChange(e.target.checked)} />
                        Remove backgrounds (on your device)
                    </label>
                    {onRemove && (
                        <button type="button" onClick={onRemove} disabled={busy} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 disabled:opacity-50">
                            <TrashIcon className="h-4 w-4" /> Take out of outfit
                        </button>
                    )}
                </div>

                <div aria-live="polite">
                    {notice && <p className="mt-2 text-xs text-gray-600">{notice}</p>}
                    {problem && <p className="mt-2 text-xs text-red-500">{problem}</p>}
                    {error?.map(e => <p key={e} className="mt-2 text-xs text-red-500">{e}</p>)}
                </div>
            </div>
        </section>
    );
}
