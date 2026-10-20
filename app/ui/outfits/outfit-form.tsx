"use client";

import Link from "next/link";
import {ReactNode, useActionState, useState, startTransition} from "react";
import {CameraIcon, CheckIcon, PlusIcon, Squares2X2Icon} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {Button} from "@/app/ui/button";
import {OutfitState} from "@/app/lib/actions";
import {Outfit, OutfitSlotKey, OUTFIT_SLOTS} from "@/app/lib/definitions";
import {compressImage} from "@/app/ui/outfits/compress-image";
import {removeBackground} from "@/app/ui/images/cutout";
import ScanOutfit, {ScannedPiece} from "@/app/ui/outfits/scan-outfit";
import PiecePicker from "@/app/ui/outfits/piece-picker";

type OutfitAction = (prevState: OutfitState | undefined, formData: FormData) => Promise<OutfitState | undefined>;

const REQUIRED_SLOTS = OUTFIT_SLOTS.filter(s => s.required);
const ACCESSORY_SLOTS = OUTFIT_SLOTS.filter(s => !s.required);
const ROTATION_STATUSES = ["In rotation", "Out of rotation"] as const;

// "start" and "scan" come before the pieces; then one step per piece, the accessory picker, and the details.
type Step = "start" | "scan" | "extras" | "details" | OutfitSlotKey;
type Piece = {file: File; url: string};

const isSlot = (step: Step): step is OutfitSlotKey => OUTFIT_SLOTS.some(s => s.key === step);

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

    // Editing opens on the details, with every piece one tap away; a new outfit starts with how to add it.
    const [step, setStep] = useState<Step>(outfit ? "details" : "start");
    const [pieces, setPieces] = useState<Partial<Record<OutfitSlotKey, Piece>>>({});
    const [extras, setExtras] = useState<OutfitSlotKey[]>(ACCESSORY_SLOTS.filter(s => outfit?.[s.column]).map(s => s.key));
    const [clean, setClean] = useState(true);
    const [name, setName] = useState(outfit?.name ?? "");
    const [rating, setRating] = useState<number | null>(outfit?.personal_rating ?? null);
    const [rotation, setRotation] = useState<(typeof ROTATION_STATUSES)[number]>(outfit?.rotation_status ?? "In rotation");
    const [localError, setLocalError] = useState<string | null>(null);

    const pieceSteps: OutfitSlotKey[] = [
        ...REQUIRED_SLOTS.map(s => s.key),
        ...ACCESSORY_SLOTS.filter(s => extras.includes(s.key)).map(s => s.key),
    ];
    const steps: Step[] = [...REQUIRED_SLOTS.map(s => s.key), "extras", ...pieceSteps.slice(REQUIRED_SLOTS.length), "details"];
    const index = steps.indexOf(step);

    const urlFor = (key: OutfitSlotKey) => {
        const slot = OUTFIT_SLOTS.find(s => s.key === key)!;
        if (!slot.required && !extras.includes(key)) return null;
        return pieces[key]?.url ?? outfit?.[slot.column] ?? null;
    };

    const setPiece = (key: OutfitSlotKey, file: File) => {
        setPieces(prev => {
            if (prev[key]) URL.revokeObjectURL(prev[key].url);
            return {...prev, [key]: {file, url: URL.createObjectURL(file)}};
        });
    };

    const removeExtra = (key: OutfitSlotKey) => {
        setPieces(prev => {
            if (prev[key]) URL.revokeObjectURL(prev[key].url);
            const next = {...prev};
            delete next[key];
            return next;
        });
        setExtras(prev => prev.filter(k => k !== key));
    };

    const toggleExtra = (key: OutfitSlotKey) => {
        if (extras.includes(key)) removeExtra(key);
        else setExtras(prev => [...prev, key]);
    };

    const fromScan = async (scanned: ScannedPiece[]) => {
        for (const {slot, file} of scanned) {
            setPiece(slot, clean ? await removeBackground(file, slot) : file);
        }
        const scannedExtras = scanned.map(p => p.slot).filter(k => ACCESSORY_SLOTS.some(s => s.key === k));
        setExtras(prev => [...new Set([...prev, ...scannedExtras])]);
        setStep(REQUIRED_SLOTS[0].key);
    };

    const go = (to: Step) => {
        setLocalError(null);
        setStep(to);
    };

    const save = async () => {
        if (isPending) return;
        const missing = REQUIRED_SLOTS.find(s => !urlFor(s.key));
        if (missing) {
            setLocalError(`Add your ${missing.label.toLowerCase()} first.`);
            return;
        }
        if (rating === null) {
            setLocalError("Give your outfit a rating.");
            return;
        }
        setLocalError(null);
        const formData = new FormData();
        formData.set("name", name);
        formData.set("personalRating", String(rating));
        formData.set("rotationStatus", rotation);
        setIsCompressing(true);
        try {
            for (const slot of OUTFIT_SLOTS) {
                const included = slot.required || extras.includes(slot.key);
                const piece = pieces[slot.key];
                if (included && piece) formData.set(slot.key, await compressImage(piece.file));
                else if (!included && outfit?.[slot.column]) formData.set(`remove-${slot.key}`, "on");
            }
        } finally {
            setIsCompressing(false);
        }
        startTransition(() => formAction(formData));
    };

    const canAdvance = !isSlot(step) || !REQUIRED_SLOTS.some(s => s.key === step) || !!urlFor(step);

    return (
        <div>
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                {step !== "start" && step !== "scan" && (
                    <StepBar steps={steps} current={step} isDone={(s) => isSlot(s) ? !!urlFor(s) : s === "extras" ? extras.length > 0 : rating !== null} onJump={go} />
                )}

                {step === "start" && (
                    <section>
                        <h2 className="text-lg font-semibold">How do you want to add this outfit?</h2>
                        <p className="mb-4 text-sm text-gray-600">You&apos;ll go through it one piece at a time either way.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <StartChoice
                                icon={<CameraIcon className="h-8 w-8 text-pink-500" />}
                                title="Scan a photo of your outfit"
                                text="We'll find each piece in the photo. You choose which ones to keep."
                                onClick={() => go("scan")}
                            />
                            <StartChoice
                                icon={<Squares2X2Icon className="h-8 w-8 text-blue-500" />}
                                title="Add pieces one by one"
                                text="Upload a photo or paste a shop link for each piece."
                                onClick={() => go(REQUIRED_SLOTS[0].key)}
                            />
                        </div>
                    </section>
                )}

                {step === "scan" && <ScanOutfit onDone={fromScan} onCancel={() => go("start")} />}

                {isSlot(step) && (
                    <PiecePicker
                        key={step}
                        slot={OUTFIT_SLOTS.find(s => s.key === step)!}
                        url={urlFor(step)}
                        error={errors[step]}
                        clean={clean}
                        onCleanChange={setClean}
                        onPick={(file) => setPiece(step, file)}
                        onRemove={REQUIRED_SLOTS.some(s => s.key === step) ? undefined : () => {
                            removeExtra(step);
                            go(steps[index - 1]);
                        }}
                    />
                )}

                {step === "extras" && (
                    <section>
                        <h2 className="text-lg font-semibold">Anything else?</h2>
                        <p className="mb-4 text-sm text-gray-600">Pick any accessories you&apos;re wearing. You&apos;ll add each one next.</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {ACCESSORY_SLOTS.map(slot => {
                                const on = extras.includes(slot.key);
                                const url = urlFor(slot.key);
                                return (
                                    <button
                                        key={slot.key}
                                        type="button"
                                        onClick={() => toggleExtra(slot.key)}
                                        aria-pressed={on}
                                        className={clsx(
                                            "flex items-center gap-2 rounded-lg border bg-white p-3 text-left text-sm transition-colors",
                                            on ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200 hover:border-gray-300",
                                        )}
                                    >
                                        {url ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- blob: or storage URL
                                            <img src={url} alt="" className="h-8 w-8 rounded object-contain" />
                                        ) : (
                                            <span className={clsx("flex h-8 w-8 items-center justify-center rounded", on ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400")}>
                                                {on ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                                            </span>
                                        )}
                                        {slot.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {step === "details" && (
                    <section>
                        <h2 className="text-lg font-semibold">Finish up</h2>
                        <p className="mb-4 text-sm text-gray-600">Tap a piece to change it.</p>

                        <div className="mb-6 flex flex-wrap gap-3">
                            {pieceSteps.map(key => {
                                const slot = OUTFIT_SLOTS.find(s => s.key === key)!;
                                const url = urlFor(key);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => go(key)}
                                        className={clsx(
                                            "flex w-20 flex-col items-center gap-1 rounded-lg border bg-white p-1 text-xs text-gray-600 hover:border-blue-400",
                                            errors[key]?.length || (slot.required && !url) ? "border-red-400" : "border-gray-200",
                                        )}
                                    >
                                        {url ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- blob: or storage URL
                                            <img src={url} alt="" className="h-16 w-16 object-contain" />
                                        ) : (
                                            <span className="flex h-16 w-16 items-center justify-center text-gray-400"><PlusIcon className="h-6 w-6" /></span>
                                        )}
                                        <span className="w-full truncate text-center">{slot.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mb-6">
                            <label htmlFor="name" className="mb-2 block text-sm font-medium">Outfit name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name your outfit (optional)"
                                className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm placeholder:text-gray-500"
                                aria-describedby="name-error"
                            />
                            <FieldError id="name-error" errors={errors.name} />
                        </div>

                        <fieldset className="mb-6">
                            <legend className="mb-2 block text-sm font-medium">Personal rating</legend>
                            <div className="grid grid-cols-11 gap-1">
                                {Array.from({length: 11}, (_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setRating(i)}
                                        aria-pressed={rating === i}
                                        className={clsx(
                                            "h-10 rounded-md border text-sm font-medium transition-colors",
                                            rating === i ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300",
                                        )}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                            <FieldError id="personalRating-error" errors={errors.personalRating} />
                        </fieldset>

                        <fieldset>
                            <legend className="mb-2 block text-sm font-medium">Rotation status</legend>
                            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                                {ROTATION_STATUSES.map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setRotation(status)}
                                        aria-pressed={rotation === status}
                                        className={clsx(
                                            "rounded-md px-3 py-1.5 text-sm transition-colors",
                                            rotation === status ? "bg-blue-500 font-medium text-white" : "text-gray-600 hover:bg-gray-100",
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <FieldError id="rotationStatus-error" errors={errors.rotationStatus} />
                        </fieldset>
                    </section>
                )}

                <div aria-live="polite" aria-atomic="true">
                    {(localError ?? state?.message) && <p className="mt-4 text-sm text-red-500">{localError ?? state?.message}</p>}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
                <Link
                    href="/dashboard/outfits"
                    className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                    Cancel
                </Link>
                {index >= 0 && (
                    <div className="flex gap-2">
                        {(index > 0 || !outfit) && (
                            <button
                                type="button"
                                onClick={() => go(index > 0 ? steps[index - 1] : "start")}
                                className="flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                Back
                            </button>
                        )}
                        {step === "details" ? (
                            <Button type="button" onClick={save} disabled={isPending} aria-disabled={isPending}>
                                {isPending ? "Saving..." : submitLabel}
                            </Button>
                        ) : (
                            <Button type="button" onClick={() => go(steps[index + 1])} disabled={!canAdvance} aria-disabled={!canAdvance}>
                                {isSlot(step) && canAdvance && !urlFor(step) ? "Skip" : "Next"}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StepBar({steps, current, isDone, onJump}: {
    steps: Step[];
    current: Step;
    isDone: (step: Step) => boolean;
    onJump: (step: Step) => void;
}) {
    const label = (step: Step) => step === "extras" ? "Extras" : step === "details" ? "Details" : OUTFIT_SLOTS.find(s => s.key === step)?.label ?? step;
    return (
        <nav aria-label="Outfit steps" className="mb-6 flex flex-wrap gap-2">
            {steps.map(step => (
                <button
                    key={step}
                    type="button"
                    onClick={() => onJump(step)}
                    aria-current={step === current ? "step" : undefined}
                    className={clsx(
                        "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        step === current ? "bg-blue-500 text-white" : isDone(step) ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-white text-gray-500 hover:bg-gray-100",
                    )}
                >
                    {isDone(step) && step !== current && <CheckIcon className="h-3 w-3" />}
                    {label(step)}
                </button>
            ))}
        </nav>
    );
}

function StartChoice({icon, title, text, onClick}: {icon: ReactNode; title: string; text: string; onClick: () => void}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
            {icon}
            <span className="font-medium">{title}</span>
            <span className="text-sm text-gray-600">{text}</span>
        </button>
    );
}

function FieldError({id, errors}: {id: string; errors?: string[]}) {
    return (
        <div id={id} aria-live="polite" aria-atomic="true">
            {errors?.map(error => (
                <p key={error} className="mt-1 text-sm text-red-500">{error}</p>
            ))}
        </div>
    );
}
