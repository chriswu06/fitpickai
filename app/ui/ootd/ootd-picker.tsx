"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {AnimatePresence, motion, PanInfo} from "motion/react";
import {ChevronLeftIcon, ChevronRightIcon, SparklesIcon} from "@heroicons/react/24/outline";
import {FeedOutfit} from "@/app/lib/definitions";
import {formatDateToLocal} from "@/app/lib/utils";
import {Button} from "@/app/ui/button";
import {OutfitImages, RatingSummary} from "@/app/ui/outfits/outfit-card";

type Candidate = FeedOutfit & {personal_rating: number};

const SWIPE_THRESHOLD = 80;
const todayKey = () => `ootd-${new Date().toISOString().split("T")[0]}`;

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

    // Restore today's pick so it sticks for the day.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(todayKey());
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

    const pickForMe = () => {
        const next = pickIndex(outfits, index);
        setPage([next, next >= index ? 1 : -1]);
        setPickedId(outfits[next].id);
        try {
            localStorage.setItem(todayKey(), outfits[next].id);
        } catch {
            // Ignore storage failures.
        }
    };

    const onDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.x < -SWIPE_THRESHOLD) go(1);
        else if (info.offset.x > SWIPE_THRESHOLD) go(-1);
    };

    const outfit = outfits[index];

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
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
            <Button type="button" onClick={pickForMe} className="bg-pink-500 hover:bg-pink-400 active:bg-pink-600">
                <SparklesIcon className="mr-2 h-5 w-5" /> Pick for me
            </Button>
        </div>
    );
}
