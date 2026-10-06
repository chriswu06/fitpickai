"use client";

import {useCallback, useEffect, useState} from "react";
import type {Coordinates} from "@/app/lib/weather";

const STORAGE_KEY = "fitpickai-location";

// The user's approximate location for weather, remembered on this device once they share it.
// Coordinates are rounded before leaving the browser; the server rounds again for Open-Meteo.
export function useLocation() {
    const [coords, setCoords] = useState<Coordinates | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setCoords(JSON.parse(saved));
        } catch {
            // Storage unavailable; the user can share their location again.
        }
    }, []);

    const locate = useCallback(() => {
        if (!("geolocation" in navigator)) {
            setError("This browser can't share a location.");
            return;
        }
        setIsLocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const next = {
                    latitude: Math.round(position.coords.latitude * 100) / 100,
                    longitude: Math.round(position.coords.longitude * 100) / 100,
                };
                setCoords(next);
                setIsLocating(false);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // Ignore storage failures.
                }
            },
            () => {
                setError("Couldn't get your location. Allow location access to use the weather.");
                setIsLocating(false);
            },
            {maximumAge: 60 * 60 * 1000, timeout: 15_000},
        );
    }, []);

    return {coords, locate, isLocating, error};
}
