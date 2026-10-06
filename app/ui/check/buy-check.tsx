"use client";

import {useState, useTransition} from "react";
import Image from "next/image";
import clsx from "clsx";
import {CheckCircleIcon, ShoppingCartIcon, XCircleIcon, ArrowsRightLeftIcon} from "@heroicons/react/24/outline";
import {checkGarment, CheckResult} from "@/app/lib/style-actions";
import {Button} from "@/app/ui/button";
import {compressImage} from "@/app/ui/outfits/compress-image";
import {useLocation} from "@/app/ui/weather/use-location";
import WeatherStrip from "@/app/ui/weather/weather-strip";

const DECISIONS = {
    buy: {label: "Buy it", icon: CheckCircleIcon, className: "bg-green-100 text-green-800"},
    skip: {label: "Skip it", icon: XCircleIcon, className: "bg-red-100 text-red-800"},
    try_with: {label: "Try it on first", icon: ArrowsRightLeftIcon, className: "bg-amber-100 text-amber-800"},
} as const;

const OCCASIONS = [
    {value: "0", label: "Nothing special"},
    {value: "3", label: "Smart casual (dinner, a date)"},
    {value: "4", label: "Dressy (interview, wedding guest)"},
    {value: "5", label: "Black tie"},
];

function amazonSearch(query: string) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

function Thumbs({title, items}: {title: string; items: {url: string; description: string}[]}) {
    if (items.length === 0) return null;
    return (
        <div>
            <p className="mb-2 text-sm font-medium">{title}</p>
            <ul className="flex flex-wrap gap-3">
                {items.map(item => (
                    <li key={item.url} className="w-24 text-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-white shadow-sm">
                            <Image src={item.url} alt={item.description} fill sizes="96px" className="object-contain" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">{item.description}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function BuyCheck({amazonTag}: {amazonTag: string | null}) {
    const [mode, setMode] = useState<"link" | "photo">("link");
    const [link, setLink] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    const [occasion, setOccasion] = useState("0");
    const [result, setResult] = useState<CheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isChecking, startChecking] = useTransition();
    const location = useLocation();

    const submit = () => {
        setError(null);
        startChecking(async () => {
            const formData = new FormData();
            if (mode === "link") formData.set("link", link);
            else if (photo) formData.set("photo", await compressImage(photo));
            formData.set("coords", JSON.stringify(location.coords));
            formData.set("occasionFormality", occasion);
            formData.set("occasionTitle", OCCASIONS.find(o => o.value === occasion)?.label.split(" (")[0].toLowerCase() ?? "");
            const res = await checkGarment(formData);
            if ("error" in res) {
                setError(res.error);
                setResult(null);
            } else {
                setResult(res);
            }
        });
    };

    const ready = mode === "link" ? link.trim().length > 0 : !!photo;
    const decision = result ? DECISIONS[result.decision] : null;
    const shopUrl = result && mode === "photo"
        ? amazonSearch(result.tags.description) + (amazonTag ? `&tag=${encodeURIComponent(amazonTag)}` : "")
        : null;

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <WeatherStrip {...location} />

            <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-4 flex gap-2" role="tablist">
                    {(["link", "photo"] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            role="tab"
                            aria-selected={mode === m}
                            onClick={() => setMode(m)}
                            className={clsx("rounded-full px-3 py-1 text-sm", mode === m ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100")}
                        >
                            {m === "link" ? "Shop link" : "Photo"}
                        </button>
                    ))}
                </div>
                {mode === "link" ? (
                    <div>
                        <label htmlFor="check-link" className="mb-1 block text-sm font-medium">Paste the product link</label>
                        <input
                            id="check-link"
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://..."
                            className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="check-photo" className="mb-1 block text-sm font-medium">Snap or upload the item</label>
                        <input
                            id="check-photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm"
                        />
                    </div>
                )}
                <div className="mt-4">
                    <label htmlFor="check-occasion" className="mb-1 block text-sm font-medium">Any plans this week?</label>
                    <select id="check-occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                        {OCCASIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button type="button" onClick={submit} disabled={!ready || isChecking} aria-disabled={!ready || isChecking}>
                        {isChecking ? "Checking your closet..." : "Should I buy it?"}
                    </Button>
                </div>
                {error && <p className="mt-2 text-sm text-red-500" aria-live="polite">{error}</p>}
            </div>

            {result && decision && (
                <div className="flex flex-col gap-4 rounded-xl bg-gray-50 p-4" aria-live="polite">
                    <div className="flex items-start gap-4">
                        {result.imageDataUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- data: URL from the shop
                            <img src={result.imageDataUrl} alt={result.tags.description} className="h-28 w-28 rounded-lg bg-white object-contain" />
                        )}
                        <div className="min-w-0 flex-1">
                            <span className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", decision.className)}>
                                <decision.icon className="h-4 w-4" /> {decision.label}
                            </span>
                            <p className="mt-2 font-medium">{result.headline}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                {result.tags.description} · warmth {result.tags.warmth}/5 · dressiness {result.tags.formality}/5
                                {result.tags.waterproof ? " · waterproof" : ""}
                            </p>
                        </div>
                    </div>
                    {result.explanation && <p className="rounded-lg bg-white p-3 text-sm">{result.explanation}</p>}
                    {result.reasons.length > 0 && (
                        <ul className="list-disc pl-5 text-sm text-gray-700">
                            {result.reasons.map(r => <li key={r}>{r}</li>)}
                        </ul>
                    )}
                    <Thumbs title="Goes with" items={result.pairings} />
                    <Thumbs title="Too close to" items={result.duplicates} />
                    {result.closetSize === 0 && (
                        <p className="text-xs text-gray-500">Your closet is still being catalogued. Add outfits (or wait a minute after adding them) for sharper answers.</p>
                    )}
                    {shopUrl && result.decision !== "skip" && (
                        <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 self-start rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-400">
                            <ShoppingCartIcon className="h-4 w-4" /> Find it on Amazon
                        </a>
                    )}
                </div>
            )}
            <p className="text-center text-[11px] text-gray-400">
                Verdict rules adapted from <a href="https://github.com/HackedRico/FitCheck" target="_blank" rel="noopener noreferrer" className="hover:underline">FitCheck</a> (Apache-2.0).
            </p>
        </div>
    );
}
