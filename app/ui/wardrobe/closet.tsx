"use client";

import {useState, useTransition} from "react";
import Image from "next/image";
import Link from "next/link";
import {motion, PanInfo} from "motion/react";
import {ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, NoSymbolIcon} from "@heroicons/react/24/outline";
import {OutfitImageColumn, Wardrobe, WardrobeItem} from "@/app/lib/definitions";
import {createOutfitFromWardrobe} from "@/app/lib/actions";
import {Button} from "@/app/ui/button";
import {ShopLink} from "@/app/ui/outfits/outfit-card";

const SWIPE_THRESHOLD = 50;
const VISIBLE_SIDE = 2; // Items shown on each side of the selected one.

// Signed distance from `selected` to `i` going the short way round the ring.
function ringOffset(i: number, selected: number, n: number) {
    let d = (i - selected) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
}

// One rail of the closet: clothes on a ring that spins left/right. `null` items mean "none".
function SpinRow({label, items, selected, onSelect}: {
    label: string;
    items: (WardrobeItem | null)[];
    selected: number;
    onSelect: (index: number) => void;
}) {
    const n = items.length;
    const step = (dir: number) => onSelect((selected + dir + n) % n);
    const onDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.x < -SWIPE_THRESHOLD) step(1);
        else if (info.offset.x > SWIPE_THRESHOLD) step(-1);
    };
    const current = items[selected];

    return (
        <section aria-label={label} className="rounded-xl bg-gray-50 p-3">
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-gray-500">{current ? `${selected + 1 - (items[0] === null ? 1 : 0)} of ${items.filter(Boolean).length}` : "None"}</span>
            </div>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => step(-1)} aria-label={`Previous ${label.toLowerCase()}`} className="rounded-full p-1 hover:bg-gray-200" disabled={n < 2}>
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <motion.div
                    className="relative h-36 flex-1 cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
                    style={{perspective: 800}}
                    drag="x"
                    dragConstraints={{left: 0, right: 0}}
                    dragElastic={0.3}
                    onDragEnd={onDragEnd}
                >
                    {items.map((item, i) => {
                        const offset = ringOffset(i, selected, n);
                        if (Math.abs(offset) > VISIBLE_SIDE) return null;
                        return (
                            <motion.button
                                type="button"
                                key={item?.url ?? "none"}
                                onClick={() => onSelect(i)}
                                aria-label={offset === 0 ? `Selected ${label.toLowerCase()}` : `Choose this ${label.toLowerCase()}`}
                                className="absolute left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32 overflow-hidden rounded-lg bg-white shadow-sm"
                                initial={false}
                                animate={{
                                    x: offset * 105,
                                    rotateY: offset * -40,
                                    scale: 1 - Math.abs(offset) * 0.18,
                                    opacity: 1 - Math.abs(offset) * 0.3,
                                    zIndex: 10 - Math.abs(offset),
                                }}
                                transition={{type: "spring", stiffness: 260, damping: 26}}
                            >
                                {item ? (
                                    <Image src={item.url} alt={label} fill sizes="128px" className="pointer-events-none object-contain" draggable={false} />
                                ) : (
                                    <span className="flex h-full flex-col items-center justify-center text-xs text-gray-400">
                                        <NoSymbolIcon className="h-6 w-6" /> None
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>
                <button type="button" onClick={() => step(1)} aria-label={`Next ${label.toLowerCase()}`} className="rounded-full p-1 hover:bg-gray-200" disabled={n < 2}>
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>
        </section>
    );
}

export default function Closet({wardrobe}: {wardrobe: Wardrobe}) {
    // Optional slots get a "none" option first and start on it.
    const rails = wardrobe.slots
        .filter(s => s.items.length > 0)
        .map(s => ({...s, options: s.required ? s.items : [null, ...s.items]}));
    const [selection, setSelection] = useState<Record<string, number>>(() => Object.fromEntries(rails.map(r => [r.column, 0])));
    const [name, setName] = useState("");
    const [rating, setRating] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const hasEssentials = wardrobe.slots.filter(s => s.required).every(s => s.items.length > 0);
    if (!hasEssentials) {
        return (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                Your closet fills up as you add outfits.{" "}
                <Link href="/dashboard/outfits/create" className="text-blue-600 hover:underline">Add an outfit</Link>{" "}
                to start mixing and matching.
            </div>
        );
    }

    const chosen: Partial<Record<OutfitImageColumn, string>> = {};
    for (const rail of rails) {
        const item = rail.options[selection[rail.column] ?? 0];
        if (item) chosen[rail.column] = item.url;
    }
    const allColumns = wardrobe.slots.map(s => s.column);
    const existing = wardrobe.outfits.find(o => allColumns.every(c => (o.images[c] ?? null) === (chosen[c] ?? null)));

    const spinAll = () => {
        setMessage(null);
        setSelection(Object.fromEntries(rails.map(r => [
            r.column,
            // Accessories land on "none" half the time so random fits don't get cluttered.
            !r.required && Math.random() < 0.5 ? 0 : Math.floor(Math.random() * r.options.length),
        ])));
    };

    const save = () => {
        setMessage(null);
        if (rating === "") {
            setMessage("Give this combo a rating first.");
            return;
        }
        startSaving(async () => {
            const result = await createOutfitFromWardrobe({name, personalRating: Number(rating), images: chosen});
            if (result?.message) setMessage(result.message);
        });
    };

    const essentials = rails.filter(r => r.required);
    const accessories = rails.filter(r => !r.required);

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {essentials.map(rail => (
                <SpinRow
                    key={rail.column}
                    label={rail.label}
                    items={rail.options}
                    selected={selection[rail.column] ?? 0}
                    onSelect={(i) => setSelection(s => ({...s, [rail.column]: i}))}
                />
            ))}
            {accessories.length > 0 && (
                <details className="rounded-xl">
                    <summary className="cursor-pointer py-1 text-sm font-medium">Accessories</summary>
                    <div className="mt-2 flex flex-col gap-3">
                        {accessories.map(rail => (
                            <SpinRow
                                key={rail.column}
                                label={rail.label}
                                items={rail.options}
                                selected={selection[rail.column] ?? 0}
                                onSelect={(i) => setSelection(s => ({...s, [rail.column]: i}))}
                            />
                        ))}
                    </div>
                </details>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
                Shop similar:
                {rails.map(rail => {
                    const item = rail.options[selection[rail.column] ?? 0];
                    return item && (
                        <span key={rail.column} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                            {rail.label}
                            <ShopLink outfitId={item.outfit_id} column={rail.column} label={rail.label} className="text-gray-600 hover:text-pink-500" />
                        </span>
                    );
                })}
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
                {existing ? (
                    <p className="text-sm text-gray-600">
                        You already have this one: <span className="font-medium">{existing.name ?? "Untitled outfit"}</span>.{" "}
                        <Link href={`/dashboard/outfits/${existing.id}/edit`} className="text-blue-600 hover:underline">View it</Link>
                    </p>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label htmlFor="mix-name" className="mb-1 block text-sm font-medium">Save this combo</label>
                            <input
                                id="mix-name"
                                type="text"
                                value={name}
                                maxLength={255}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name it (optional)"
                                className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400"
                            />
                        </div>
                        <div>
                            <label htmlFor="mix-rating" className="mb-1 block text-sm font-medium">Rating</label>
                            <select
                                id="mix-rating"
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                                className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                            >
                                <option value="" disabled>0-10</option>
                                {Array.from({length: 11}, (_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        <Button type="button" onClick={save} disabled={isSaving} aria-disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save outfit"}
                        </Button>
                    </div>
                )}
                {message && <p className="mt-2 text-sm text-red-500" aria-live="polite">{message}</p>}
            </div>

            <div className="flex justify-center">
                <Button type="button" onClick={spinAll} className="bg-pink-500 hover:bg-pink-400 active:bg-pink-600">
                    <ArrowPathIcon className="mr-2 h-5 w-5" /> Spin the closet
                </Button>
            </div>
        </div>
    );
}
