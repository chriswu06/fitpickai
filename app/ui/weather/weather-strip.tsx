"use client";

import {useEffect, useState} from "react";
import {MapPinIcon} from "@heroicons/react/24/outline";
import {cToF, Forecast, weatherWord} from "@/app/lib/garments";
import {getForecast} from "@/app/lib/style-actions";
import type {Coordinates} from "@/app/lib/weather";

const weekday = (day: string, i: number) =>
    i === 0 ? "Today" : new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {weekday: "short", timeZone: "UTC"});

// The coming days' weather, or a button to share a location. `days` limits how many show.
export default function WeatherStrip({coords, locate, isLocating, error, days = 7}: {
    coords: Coordinates | null;
    locate: () => void;
    isLocating: boolean;
    error: string | null;
    days?: number;
}) {
    const [forecast, setForecast] = useState<Forecast | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!coords) return;
        let cancelled = false;
        getForecast(coords).then((f) => {
            if (cancelled) return;
            setForecast(f);
            setFailed(!f);
        });
        return () => {
            cancelled = true;
        };
    }, [coords]);

    if (!coords) {
        return (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                <span>Share your location so picks match the weather.</span>
                <button type="button" onClick={locate} disabled={isLocating} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-medium shadow-sm hover:bg-sky-100">
                    <MapPinIcon className="h-4 w-4" /> {isLocating ? "Locating..." : "Use my location"}
                </button>
                {error && <span className="w-full text-xs text-red-600">{error}</span>}
            </div>
        );
    }
    if (failed) return <p className="text-xs text-gray-500">Weather is unavailable right now.</p>;
    if (!forecast) return <div className="h-16 animate-pulse rounded-lg bg-gray-100" aria-label="Loading weather" />;

    return (
        <div>
            <ul className="flex gap-2 overflow-x-auto pb-1">
                {forecast.days.slice(0, days).map((d, i) => (
                    <li key={d.day} className="min-w-[4.5rem] flex-1 rounded-lg bg-sky-50 px-2 py-1.5 text-center text-xs text-sky-900">
                        <p className="font-semibold">{weekday(d.day, i)}</p>
                        <p>{cToF(d.temp_max_c)}° / {cToF(d.temp_min_c)}°</p>
                        <p className="truncate text-sky-700">{weatherWord(d.weather_code)}</p>
                    </li>
                ))}
            </ul>
            <p className="mt-1 text-right text-[10px] text-gray-400">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">{forecast.attribution}</a>
            </p>
        </div>
    );
}
