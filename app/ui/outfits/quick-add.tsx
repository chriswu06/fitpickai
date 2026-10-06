"use client";

import {useRef, useState} from "react";
import {CameraIcon, LinkIcon} from "@heroicons/react/24/outline";
import {OUTFIT_SLOTS, OutfitSlotKey} from "@/app/lib/definitions";
import {importGarmentLink, scanOutfit} from "@/app/lib/style-actions";
import {compressImage} from "@/app/ui/outfits/compress-image";
import {canvasToFile, cropBox} from "@/app/ui/images/canvas";
import {removeBackground} from "@/app/ui/images/cutout";

// A photo handed to one slot of the outfit form. `id` changes on every hand-off.
export type Injected = {file: File; id: string};

const labelFor = (slot: OutfitSlotKey) => OUTFIT_SLOTS.find(s => s.key === slot)?.label ?? slot;

// Fill the form fast: scan one photo of a whole outfit, or paste a shop link for one piece.
export default function QuickAdd({onGarment, clean}: {onGarment: (slot: OutfitSlotKey, file: File) => void; clean: boolean}) {
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [link, setLink] = useState("");
    const [busy, setBusy] = useState(false);
    const photoRef = useRef<HTMLInputElement>(null);

    const run = async (work: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await work();
        } catch (e) {
            console.error(e);
            setError("Something went wrong. Try again.");
            setStatus(null);
        } finally {
            setBusy(false);
        }
    };

    const scan = (file: File) => run(async () => {
        setStatus("Looking for clothes in your photo...");
        const photo = await compressImage(file);
        const formData = new FormData();
        formData.set("photo", photo);
        const result = await scanOutfit(formData);
        if ("error" in result) {
            setError(result.error);
            setStatus(null);
            return;
        }
        // One piece per slot: the biggest one wins (the main item, not a background one).
        const area = (b: {left: number; top: number; right: number; bottom: number}) => (b.right - b.left) * (b.bottom - b.top);
        const bySlot = new Map<OutfitSlotKey, (typeof result.garments)[number]>();
        for (const g of result.garments) {
            const current = bySlot.get(g.slot);
            if (!current || area(g.box) > area(current.box)) bySlot.set(g.slot, g);
        }
        setStatus(`Found ${[...bySlot.values()].map(g => g.tags.description).join(", ")}. Cutting them out...`);
        for (const [slot, g] of bySlot) {
            const cropped = await canvasToFile(await cropBox(photo, g.box), slot);
            onGarment(slot, clean ? await removeBackground(cropped, slot) : cropped);
        }
        setStatus(`Added ${bySlot.size} ${bySlot.size === 1 ? "piece" : "pieces"} from your photo. Check them below and swap any that look off.`);
    });

    const importLink = () => run(async () => {
        if (!link.trim()) return;
        setStatus("Fetching the product photo...");
        const result = await importGarmentLink(link);
        if ("error" in result) {
            setError(result.error);
            setStatus(null);
            return;
        }
        const blob = await (await fetch(result.dataUrl)).blob();
        const file = new File([blob], `${result.slot}.${blob.type.split("/")[1] ?? "jpg"}`, {type: blob.type});
        onGarment(result.slot, clean ? await removeBackground(file, result.slot) : file);
        setStatus(`Added ${result.tags.description} as your ${labelFor(result.slot).toLowerCase()}.`);
        setLink("");
    });

    return (
        <section className="mb-4 rounded-lg border border-dashed border-pink-300 bg-pink-50/50 p-4">
            <p className="mb-3 text-sm font-medium">Quick add</p>
            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => photoRef.current?.click()}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-pink-500 px-4 text-sm font-medium text-white hover:bg-pink-400 disabled:opacity-50"
                >
                    <CameraIcon className="h-5 w-5" /> Scan a photo of your outfit
                </button>
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
                <div className="flex flex-1 gap-2">
                    <label htmlFor="shop-link" className="sr-only">Shop link</label>
                    <div className="relative flex-1">
                        <LinkIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            id="shop-link"
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (!busy) importLink();
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
            </div>
            <div aria-live="polite">
                {status && <p className="mt-2 text-xs text-gray-600">{status}</p>}
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
        </section>
    );
}
