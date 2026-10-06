"use client";

import {useEffect, useState, useTransition} from "react";
import Link from "next/link";
import {AnimatePresence, motion, PanInfo} from "motion/react";
import {ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon} from "@heroicons/react/24/outline";
import {FeedOutfit} from "@/app/lib/definitions";
import {aiPickOutfit} from "@/app/lib/style-actions";
import {useLocation} from "@/app/ui/weather/use-location";
import WeatherStrip from "@/app/ui/weather/weather-strip";
import {formatDateToLocal} from "@/app/lib/utils";
import {Button} from "@/app/ui/button";
import {OutfitImages, RatingSummary} from "@/app/ui/outfits/outfit-card";

type Candidate = FeedOutfit & {personal_rating: number};

const SWIPE_THRESHOLD = 80;
const dayKey = (daysAgo = 0) => `ootd-${new Date(Date.now() - daysAgo * 86_400_000).toISOString().split("T")[0]}`;
const todayKey = () => dayKey();

// Outfits picked on the previous 7 days, so the AI can avoid repeats.
function recentPicks() {
    try {
        return Array.from({length: 7}, (_, i) => localStorage.getItem(dayKey(i + 1))).filter((id): id is string => !!id);
    } catch {
        return [];
    }
}

// Blend of how you rate it and how friends rate it (friends count once they've rated).
function score(outfit: Candidate) {
    return outfit.avg_friend_rating === null
        ? outfit.personal_rating
        : (outfit.personal_rating + outfit.avg_friend_rating) / 2;
}

// Weighted random pick favouring higher-scored outfits, avoiding the one currently shown.
function pickIndex(outfits: Candidate[], avoid: number) {
    const weights = outfits.map((o, i) => (i === avoid && outfits.length > 1 ? 0 : (score(o) + 1) ** 2));
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return i;
    }
    return 0;
}

export default function OotdPicker({outfits}: {outfits: Candidate[]}) {
    const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [reason, setReason] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isThinking, startThinking] = useTransition();
    const location = useLocation();

    // Restore today's pick so it sticks for the day.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(todayKey());
            setReason(localStorage.getItem(`${todayKey()}-reason`));
            const savedIndex = outfits.findIndex(o => o.id === saved);
            if (savedIndex >= 0) {
                setPickedId(saved);
                setPage([savedIndex, 0]);
            }
        } catch {
            // Storage unavailable; the pick just won't persist.
        }
    }, [outfits]);

    if (outfits.length === 0) {
        return (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
                You don&apos;t have any outfits in rotation.{" "}
                <Link href="/dashboard/outfits/create" className="text-blue-600 hover:underline">Add one</Link>{" "}
                or put an existing outfit back in rotation.
            </div>
        );
    }

    const go = (step: number) => setPage(([i]) => [(i + step + outfits.length) % outfits.length, step]);

    const choose = (next: number, why: string | null) => {
        setPage([next, next >= index ? 1 : -1]);
        setPickedId(outfits[next].id);
        setReason(why);
        try {
            localStorage.setItem(todayKey(), outfits[next].id);
            if (why) localStorage.setItem(`${todayKey()}-reason`, why);
            else localStorage.removeItem(`${todayKey()}-reason`);
        } catch {
            // Ignore storage failures.
        }
    };

    const surpriseMe = () => {
        setAiError(null);
        choose(pickIndex(outfits, index), null);
    };

    const askAi = () => {
        setAiError(null);
        startThinking(async () => {
            const result = await aiPickOutfit(note, recentPicks(), location.coords);
            const next = result.outfitId ? outfits.findIndex(o => o.id === result.outfitId) : -1;
            if (next < 0) {
                setAiError(`${result.error ?? "FitPickAI picked an outfit that's no longer in rotation."} Here's a random pick instead.`);
                choose(pickIndex(outfits, index), null);
            } else {
                choose(next, result.reason ?? null);
            }
        });
    };

    const onDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.x < -SWIPE_THRESHOLD) go(1);
        else if (info.offset.x > SWIPE_THRESHOLD) go(-1);
    };

    const outfit = outfits[index];

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
            <div className="w-full">
                <WeatherStrip {...location} days={3} />
            </div>
            <div className="flex w-full items-center gap-2">
                <button type="button" onClick={() => go(-1)} aria-label="Previous outfit" className="rounded-full p-2 hover:bg-gray-100">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <div className="relative h-[460px] flex-1 overflow-hidden">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={outfit.id}
                            custom={direction}
                            initial={{x: direction * 300, opacity: 0, rotate: direction * 8}}
                            animate={{x: 0, opacity: 1, rotate: 0}}
                            exit={{x: direction * -300, opacity: 0, rotate: direction * -8}}
                            transition={{type: "spring", stiffness: 300, damping: 30}}
                            drag="x"
                            dragConstraints={{left: 0, right: 0}}
                            dragElastic={0.7}
                            onDragEnd={onDragEnd}
                            className="absolute inset-0 flex cursor-grab flex-col rounded-2xl bg-gray-50 p-5 shadow-md active:cursor-grabbing"
                        >
                            <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-lg font-semibold">{outfit.name ?? "Untitled outfit"}</p>
                                    <p className="text-xs text-gray-500">Added {formatDateToLocal(outfit.date)}</p>
                                </div>
                                {pickedId === outfit.id && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-500 px-2 py-1 text-xs text-white">
                                        <SparklesIcon className="h-3 w-3" /> Today&apos;s pick
                                    </span>
                                )}
                            </div>
                            <div className="pointer-events-none flex flex-1 items-center">
                                <OutfitImages outfit={outfit} size={120} />
                            </div>
                            <div className="mt-3 flex justify-between text-xs text-gray-600">
                                <span>You: {outfit.personal_rating}/10</span>
                                <span>Friends: <RatingSummary outfit={outfit} /></span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
                <button type="button" onClick={() => go(1)} aria-label="Next outfit" className="rounded-full p-2 hover:bg-gray-100">
                    <ChevronRightIcon className="h-6 w-6" />
                </button>
            </div>
            <p className="text-xs text-gray-500">{index + 1} of {outfits.length} · swipe or use the arrows</p>
            {reason && pickedId === outfit.id && (
                <p className="w-full rounded-lg bg-pink-50 p-3 text-sm text-pink-900">{reason}</p>
            )}
            <div className="w-full">
                <label htmlFor="ootd-note" className="mb-1 block text-sm font-medium">What&apos;s today looking like?</label>
                <input
                    id="ootd-note"
                    type="text"
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isThinking) askAi();
                    }}
                    placeholder="e.g. coffee with friends, then a presentation"
                    className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400"
                />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={askAi} disabled={isThinking} aria-disabled={isThinking} className="bg-pink-500 hover:bg-pink-400 active:bg-pink-600">
                    <SparklesIcon className="mr-2 h-5 w-5" /> {isThinking ? "Picking..." : "Pick for me"}
                </Button>
                <Button type="button" onClick={surpriseMe} disabled={isThinking} aria-disabled={isThinking} className="bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300">
                    <ArrowPathIcon className="mr-2 h-5 w-5" /> Surprise me
                </Button>
            </div>
            {aiError && <p className="text-center text-xs text-gray-500" aria-live="polite">{aiError}</p>}
        </div>
    );
}
