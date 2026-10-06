import "server-only";
import {Forecast} from "@/app/lib/garments";

// Daily forecast from the free Open-Meteo API (no key needed), ported from FitCheck
// (github.com/HackedRico/FitCheck, Apache-2.0), engine/src/fitcheck/context/open_meteo.py.

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ATTRIBUTION = "Weather data by Open-Meteo.com";
const CACHE_TTL_MS = 30 * 60 * 1000;
const DAILY_FIELDS = ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "precipitation_probability_max", "weather_code"];

// Rounded coordinates -> forecast. Two decimals is about 1 km: close enough for weather, and it
// keeps the user's exact spot out of the request.
const cache = new Map<string, {at: number; forecast: Forecast}>();

export type Coordinates = {latitude: number; longitude: number};

export function validCoordinates(value: unknown): value is Coordinates {
    const c = value as Coordinates | null;
    return !!c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
        && Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180;
}

// Returns null when Open-Meteo can't be reached, so callers carry on without weather.
export async function fetchForecast({latitude, longitude}: Coordinates, days = 7): Promise<Forecast | null> {
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    const key = `${lat},${lon},${days}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.forecast;

    const url = new URL(FORECAST_URL);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("daily", DAILY_FIELDS.join(","));
    // Days follow the place's own midnight, not the server's.
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", String(days));
    try {
        const res = await fetch(url, {signal: AbortSignal.timeout(10_000)});
        if (!res.ok) throw new Error(`Open-Meteo answered HTTP ${res.status}`);
        const {daily} = await res.json();
        const forecast: Forecast = {
            days: (daily.time as string[]).map((day, i) => ({
                day,
                temp_min_c: daily.temperature_2m_min[i],
                temp_max_c: daily.temperature_2m_max[i],
                precipitation_mm: daily.precipitation_sum[i] ?? 0,
                // Null for days past the probability model's horizon.
                precipitation_probability: daily.precipitation_probability_max[i] ?? null,
                weather_code: daily.weather_code[i] ?? null,
            })),
            attribution: ATTRIBUTION,
        };
        cache.set(key, {at: Date.now(), forecast});
        return forecast;
    } catch (error) {
        console.error("Weather Error: ", error);
        return null;
    }
}
