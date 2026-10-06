"use client";

import Link from "next/link";
import {useActionState, useEffect, useRef, useState, startTransition} from "react";
import {PhotoIcon, XMarkIcon} from "@heroicons/react/24/outline";
import QuickAdd, {Injected} from "@/app/ui/outfits/quick-add";
import {removeBackground} from "@/app/ui/images/cutout";
import clsx from "clsx";
import {Button} from "@/app/ui/button";
import {OutfitState} from "@/app/lib/actions";
import {Outfit, OutfitSlot, OutfitSlotKey, OUTFIT_SLOTS} from "@/app/lib/definitions";
import {compressImage} from "@/app/ui/outfits/compress-image";

type OutfitAction = (prevState: OutfitState | undefined, formData: FormData) => Promise<OutfitState | undefined>;

const REQUIRED_SLOTS = OUTFIT_SLOTS.filter(s => s.required);
const ACCESSORY_SLOTS = OUTFIT_SLOTS.filter(s => !s.required);

function FieldError({id, errors}: {id: string; errors?: string[]}) {
    return (
        <div id={id} aria-live="polite" aria-atomic="true">
            {errors?.map(error => (
                <p key={error} className="mt-1 text-sm text-red-500">{error}</p>
            ))}
        </div>
    );
}

function ImagePicker({slot, existingUrl, errors, injected, clean}: {
    slot: OutfitSlot;
    existingUrl?: string | null;
    errors?: string[];
    injected?: Injected;
    clean: boolean;
}) {
    const [preview, setPreview] = useState<string | null>(null);
    const [removed, setRemoved] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Puts a file into the real <input> so it's submitted with the form like a picked one.
    const applyFile = (file: File) => {
        if (inputRef.current) {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            inputRef.current.files = transfer.files;
        }
        setPreview(URL.createObjectURL(file));
        setRemoved(false);
    };

    // Photos from a scan or a shop link arrive here already cleaned up.
    useEffect(() => {
        if (injected) applyFile(injected.file);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only for a new injection
    }, [injected]);

    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const shown = preview ?? (removed ? null : existingUrl);
    const errorId = `${slot.key}-error`;

    return (
        <div className="flex flex-col">
            <label
                htmlFor={slot.key}
                className={clsx(
                    "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-white text-sm text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50",
                    errors?.length ? "border-red-400" : "border-gray-300",
                )}
            >
                {isCleaning && (
                    <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-xs text-gray-600">Removing background...</span>
                )}
                {shown ? (
                    // eslint-disable-next-line @next/next/no-img-element -- previews are blob: URLs
                    <img src={shown} alt={`${slot.label} preview`} className="h-full w-full object-contain" />
                ) : (
                    <>
                        <PhotoIcon className="h-8 w-8" />
                        <span className="mt-1">Upload</span>
                    </>
                )}
                <input
                    ref={inputRef}
                    id={slot.key}
                    name={slot.key}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-describedby={errorId}
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        setPreview(file ? URL.createObjectURL(file) : null);
                        if (!file) return;
                        setRemoved(false);
                        if (clean) {
                            setIsCleaning(true);
                            applyFile(await removeBackground(file, slot.key));
                            setIsCleaning(false);
                        }
                    }}
                />
            </label>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium">
                    {slot.label}
                    {slot.required && <span className="text-red-500"> *</span>}
                </span>
                {!slot.required && existingUrl && !preview && (
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                        <input
                            type="checkbox"
                            name={`remove-${slot.key}`}
                            checked={removed}
                            onChange={(e) => setRemoved(e.target.checked)}
                        />
                        <XMarkIcon className="h-3 w-3" /> Remove
                    </label>
                )}
            </div>
            <FieldError id={errorId} errors={errors} />
        </div>
    );
}

export default function OutfitForm({
    action,
    outfit,
    submitLabel,
}: {
    action: OutfitAction;
    outfit?: Outfit;
    submitLabel: string;
}) {
    const initialState: OutfitState = {message: null, errors: {}};
    const [state, formAction, isActionPending] = useActionState(action, initialState);
    const [isCompressing, setIsCompressing] = useState(false);
    const isPending = isActionPending || isCompressing;
    const errors = state?.errors ?? {};
    const [injected, setInjected] = useState<Partial<Record<OutfitSlotKey, Injected>>>({});
    const [clean, setClean] = useState(true);
    const [accessoriesOpen, setAccessoriesOpen] = useState(ACCESSORY_SLOTS.some(s => outfit?.[s.column]));

    const inject = (slot: OutfitSlotKey, file: File) => {
        setInjected(prev => ({...prev, [slot]: {file, id: crypto.randomUUID()}}));
        if (ACCESSORY_SLOTS.some(s => s.key === slot)) setAccessoriesOpen(true);
    };

    return (
        <form
            // Submit manually so React doesn't reset the form (and lose chosen files) when validation fails.
            onSubmit={async (e) => {
                e.preventDefault();
                if (isPending) return;
                const formData = new FormData(e.currentTarget);
                setIsCompressing(true);
                try {
                    for (const slot of OUTFIT_SLOTS) {
                        const file = formData.get(slot.key);
                        if (file instanceof File && file.size > 0) {
                            formData.set(slot.key, await compressImage(file));
                        }
                    }
                } finally {
                    setIsCompressing(false);
                }
                startTransition(() => formAction(formData));
            }}
        >
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                <QuickAdd onGarment={inject} clean={clean} />
                <label className="mb-6 flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} />
                    Remove photo backgrounds automatically (runs on your device)
                </label>
                <div className="mb-6">
                    <label htmlFor="name" className="mb-2 block text-sm font-medium">Outfit name</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        defaultValue={outfit?.name ?? ""}
                        placeholder="Name your outfit (optional)"
                        className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm placeholder:text-gray-500"
                        aria-describedby="name-error"
                    />
                    <FieldError id="name-error" errors={errors.name} />
                </div>

                <fieldset className="mb-6">
                    <legend className="mb-2 block text-sm font-medium">The essentials</legend>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {REQUIRED_SLOTS.map(slot => (
                            <ImagePicker key={slot.key} slot={slot} existingUrl={outfit?.[slot.column]} errors={errors[slot.key]} injected={injected[slot.key]} clean={clean} />
                        ))}
                    </div>
                </fieldset>

                <details className="mb-6" open={accessoriesOpen} onToggle={(e) => setAccessoriesOpen(e.currentTarget.open)}>
                    <summary className="mb-2 cursor-pointer text-sm font-medium">Accessories (optional)</summary>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {ACCESSORY_SLOTS.map(slot => (
                            <ImagePicker key={slot.key} slot={slot} existingUrl={outfit?.[slot.column]} errors={errors[slot.key]} injected={injected[slot.key]} clean={clean} />
                        ))}
                    </div>
                </details>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="personalRating" className="mb-2 block text-sm font-medium">Personal rating</label>
                        <select
                            id="personalRating"
                            name="personalRating"
                            defaultValue={outfit?.personal_rating ?? ""}
                            className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
                            aria-describedby="personalRating-error"
                        >
                            <option value="" disabled>Select rating</option>
                            {Array.from({length: 11}, (_, i) => (
                                <option key={i} value={i}>{i}</option>
                            ))}
                        </select>
                        <FieldError id="personalRating-error" errors={errors.personalRating} />
                    </div>

                    <fieldset>
                        <legend className="mb-2 block text-sm font-medium">Rotation status</legend>
                        <div className="flex gap-4 rounded-md border border-gray-200 bg-white px-3 py-2">
                            {(["In rotation", "Out of rotation"] as const).map(status => (
                                <label key={status} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="rotationStatus"
                                        value={status}
                                        defaultChecked={(outfit?.rotation_status ?? "In rotation") === status}
                                    />
                                    {status}
                                </label>
                            ))}
                        </div>
                        <FieldError id="rotationStatus-error" errors={errors.rotationStatus} />
                    </fieldset>
                </div>

                <div aria-live="polite" aria-atomic="true">
                    {state?.message && <p className="mt-4 text-sm text-red-500">{state.message}</p>}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
                <Link
                    href="/dashboard/outfits"
                    className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                    Cancel
                </Link>
                <Button type="submit" disabled={isPending} aria-disabled={isPending}>
                    {isPending ? "Saving..." : submitLabel}
                </Button>
            </div>
        </form>
    );
}
