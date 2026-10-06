"use client";

import {useState, useTransition} from "react";
import clsx from "clsx";
import {rateOutfit} from "@/app/lib/actions";

export default function RateOutfit({outfitId, myRating}: {outfitId: string; myRating: number | null}) {
    const [rating, setRating] = useState(myRating);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const rate = (value: number) => {
        const previous = rating;
        setRating(value);
        setError(null);
        startTransition(async () => {
            const result = await rateOutfit(outfitId, value);
            if (result?.message) {
                setRating(previous);
                setError(result.message);
            }
        });
    };

    return (
        <div>
            <p className="mb-1 text-xs text-gray-500">{rating === null ? "Rate this fit" : `Your rating: ${rating}/10`}</p>
            <div className={clsx("flex flex-wrap gap-0.5", isPending && "opacity-60")} role="radiogroup" aria-label="Rate this outfit">
                {Array.from({length: 11}, (_, i) => (
                    <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={rating === i}
                        disabled={isPending}
                        onClick={() => rate(i)}
                        className={clsx(
                            "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
                            rating !== null && i <= rating ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-pink-100",
                        )}
                    >
                        {i}
                    </button>
                ))}
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
