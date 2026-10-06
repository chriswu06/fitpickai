import {z} from "zod/v4";

// Garment vocabulary ported from FitCheck (github.com/HackedRico/FitCheck, Apache-2.0),
// engine/src/fitcheck/domain.py. Safe to import from client and server code.

export const CATEGORIES = ["top", "sweater", "shirt", "outerwear", "dress", "bottom", "shoes", "accessory"] as const;
export const COLOR_FAMILIES = ["black", "white", "grey", "navy", "blue", "green", "yellow", "red", "pink", "brown", "beige", "multi"] as const;
export const PATTERNS = ["solid", "stripe", "check", "floral", "graphic", "other"] as const;

export type Category = (typeof CATEGORIES)[number];

export const GarmentTagsSchema = z.object({
    category: z.enum(CATEGORIES),
    color_family: z.enum(COLOR_FAMILIES),
    pattern: z.enum(PATTERNS),
    warmth: z.number().int().min(1).max(5).describe("1 = summer tee, 5 = winter parka"),
    waterproof: z.boolean(),
    formality: z.number().int().min(1).max(5).describe("1 = gym, 5 = black tie"),
    description: z.string().max(120),
});

export type GarmentTags = z.infer<typeof GarmentTagsSchema>;

// A tagged piece the user owns. `wears` counts the outfits it appears in.
export type ClosetGarment = {
    id: string; // The image URL; garments are identified by their photo.
    tags: GarmentTags;
    wears: number;
};

export type DayForecast = {
    day: string; // YYYY-MM-DD in the location's own time zone
    temp_min_c: number;
    temp_max_c: number;
    precipitation_mm: number;
    precipitation_probability: number | null;
    weather_code: number | null;
};

export type Forecast = {
    days: DayForecast[];
    // Open-Meteo's CC BY 4.0 data license requires this credit wherever the forecast shows.
    attribution: string;
};

// WMO weather codes as Open-Meteo reports them, grouped into words a person would say.
export function weatherWord(code: number | null) {
    if (code === null) return "";
    if (code === 0) return "clear";
    if (code <= 3) return "partly cloudy";
    if (code <= 48) return "foggy";
    if (code <= 57) return "drizzle";
    if (code <= 67) return "rain";
    if (code <= 77) return "snow";
    if (code <= 82) return "showers";
    if (code <= 86) return "snow showers";
    return "thunderstorms";
}

export const cToF = (c: number) => Math.round((c * 9) / 5 + 32);

// One line per day, for prompts and the forecast strip.
export function describeDay(d: DayForecast) {
    const rain = d.precipitation_probability !== null ? `, ${d.precipitation_probability}% chance of rain` : "";
    return `${weatherWord(d.weather_code) || "weather unknown"}, ${cToF(d.temp_min_c)}-${cToF(d.temp_max_c)}°F${rain}`;
}
