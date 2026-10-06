import {Category, ClosetGarment, DayForecast, GarmentTags} from "@/app/lib/garments";

// "Should I buy this?" rules, ported from FitCheck (github.com/HackedRico/FitCheck, Apache-2.0),
// engine/src/fitcheck/verdict/__init__.py and docs/verdict-rules.md. Plain, deterministic code
// decides BUY, SKIP or TRY_WITH so the same garment always gets the same answer; the AI only
// explains it. Calendar events are replaced by an optional dress code the user picks.

export type Decision = "buy" | "skip" | "try_with";
export type ReasonCode = "duplicates" | "fills_weather_gap" | "fits_event" | "statement_piece" | "pairs_well" | "few_pairings";

export type Reason = {code: ReasonCode; message: string; garment_ids: string[]};

export type Verdict = {
    decision: Decision;
    headline: string;
    reasons: Reason[];
    duplicates: ClosetGarment[];
    pairings: ClosetGarment[];
    best_pairing: ClosetGarment | null;
};

// An occasion coming up, with its dress code (1 = gym, 5 = black tie).
export type Occasion = {title: string; formality: number};

// Buying a third garment that close to two you own adds nothing.
const SKIP_AT_DUPLICATES = 2;
// A garment that goes with this many things earns its place without filling a gap.
const VERSATILE_AT_PAIRINGS = 3;
// A wet day by rain amount or by forecast chance, whichever the source reports.
const WET_DAY_MM = 1.0;
const WET_DAY_CHANCE = 60;
// One wet day is an umbrella; two or more is a raincoat.
const RAIN_GAP_AT_WET_DAYS = 2;
// A day this cold or colder needs a coat rated warmth 4 or more.
const COLD_DAY_C = 5.0;
const WARM_COAT_AT_WARMTH = 4;
// An occasion at this dress code or above needs something bought for it.
const FORMAL_EVENT_AT = 4;

// Categories worn together; listed once per pair, read both ways.
const WORN_TOGETHER: [Category, Category][] = [
    ["top", "bottom"], ["top", "outerwear"], ["top", "shoes"],
    ["sweater", "bottom"], ["sweater", "outerwear"], ["sweater", "shoes"], ["sweater", "shirt"], ["sweater", "dress"],
    ["shirt", "bottom"], ["shirt", "outerwear"], ["shirt", "shoes"],
    ["outerwear", "dress"], ["outerwear", "bottom"],
    ["dress", "shoes"],
    ["bottom", "shoes"],
    ...(["top", "sweater", "shirt", "outerwear", "dress", "bottom", "shoes"] as Category[]).map(c => ["accessory", c] as [Category, Category]),
];

// Stripes and checks read as basics; these prints are what people call loud.
const BOLD_PATTERNS = new Set(["floral", "graphic", "other"]);

const NOUN: Record<Category, string> = {
    top: "top", sweater: "sweater", shirt: "shirt", outerwear: "jacket",
    dress: "dress", bottom: "trousers or skirt", shoes: "shoes", accessory: "accessory",
};
const PLURAL: Record<Category, string> = {
    top: "tops", sweater: "sweaters", shirt: "shirts", outerwear: "jackets",
    dress: "dresses", bottom: "bottoms", shoes: "pairs of shoes", accessory: "accessories",
};

export function decide(candidate: GarmentTags, closet: ClosetGarment[], days: DayForecast[], occasions: Occasion[], today: string): Verdict {
    const pairings = rankPairings(candidate, closet);
    const gaps = gapsFilled(candidate, closet, days, occasions, today);
    // Nothing owned covers a filled gap, so nothing owned can be a duplicate of the candidate.
    if (gaps.length > 0) {
        return {
            decision: "buy",
            headline: `Buy it: ${gaps[0].headline}.`,
            reasons: [...gaps.map(g => g.reason), pairingsReason(pairings)],
            duplicates: [],
            pairings,
            best_pairing: pairings[0] ?? null,
        };
    }
    const duplicates = closet.filter(g => isDuplicate(candidate, g.tags));
    if (duplicates.length >= SKIP_AT_DUPLICATES) {
        return {
            decision: "skip",
            headline: `Skip it: you already own ${duplicates.length} ${colorWord(candidate.color_family)} ${PLURAL[candidate.category]} like this one.`,
            reasons: [duplicatesReason(duplicates)],
            duplicates,
            pairings: [],
            best_pairing: null,
        };
    }
    const statement = isStatement(candidate);
    if (duplicates.length === 0 && !statement && pairings.length >= VERSATILE_AT_PAIRINGS) {
        return {
            decision: "buy",
            headline: `Buy it: it goes with ${pairings.length} things you own and you have nothing like it.`,
            reasons: [pairingsReason(pairings)],
            duplicates: [],
            pairings,
            best_pairing: pairings[0],
        };
    }
    if (pairings.length === 0) {
        return {
            decision: "skip",
            headline: "Skip it: nothing you own goes with it.",
            reasons: [pairingsReason(pairings)],
            duplicates,
            pairings: [],
            best_pairing: null,
        };
    }
    return {
        decision: "try_with",
        headline: `Try it with your ${phrase(pairings[0])}: ${caveat(duplicates, statement, pairings)}.`,
        reasons: [
            ...(duplicates.length ? [duplicatesReason(duplicates)] : []),
            ...(statement ? [STATEMENT_REASON] : []),
            pairingsReason(pairings),
        ],
        duplicates,
        pairings,
        best_pairing: pairings[0],
    };
}

function isDuplicate(candidate: GarmentTags, owned: GarmentTags) {
    return owned.category === candidate.category
        && owned.color_family === candidate.color_family
        && owned.pattern === candidate.pattern
        && Math.abs(owned.formality - candidate.formality) <= 1;
}

function isStatement(candidate: GarmentTags) {
    return candidate.color_family === "multi" || BOLD_PATTERNS.has(candidate.pattern);
}

function pairsWith(candidate: GarmentTags, owned: GarmentTags) {
    return wornTogether(candidate.category, owned.category)
        && Math.abs(owned.formality - candidate.formality) <= 1
        // One pattern per outfit: two prints side by side clash.
        && (candidate.pattern === "solid" || owned.pattern === "solid");
}

function wornTogether(a: Category, b: Category) {
    return WORN_TOGETHER.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function rankPairings(candidate: GarmentTags, closet: ClosetGarment[]) {
    // Closest formality wins, then the most worn, then closet order, so ties repeat run to run.
    return closet
        .map((g, i) => ({g, i}))
        .filter(({g}) => pairsWith(candidate, g.tags))
        .sort((a, b) =>
            Math.abs(a.g.tags.formality - candidate.formality) - Math.abs(b.g.tags.formality - candidate.formality)
            || b.g.wears - a.g.wears
            || a.i - b.i)
        .map(({g}) => g);
}

type Gap = {reason: Reason; headline: string};

function gapsFilled(candidate: GarmentTags, closet: ClosetGarment[], days: DayForecast[], occasions: Occasion[], today: string): Gap[] {
    // Days already past need nothing.
    const upcoming = days.filter(d => d.day >= today);
    return [
        rainGap(candidate, closet, upcoming),
        coldGap(candidate, closet, upcoming, today),
        ...occasions.map(o => eventGap(candidate, closet, o)),
    ].filter((g): g is Gap => g !== null);
}

function rainGap(candidate: GarmentTags, closet: ClosetGarment[], days: DayForecast[]): Gap | null {
    const wet = days.filter(isWet);
    if (!isShell(candidate) || closet.some(g => isShell(g.tags)) || wet.length < RAIN_GAP_AT_WET_DAYS) return null;
    const when = `${wet.length} of the next ${days.length} days`;
    return {
        reason: {code: "fills_weather_gap", message: `Rain is due on ${when} and you own no waterproof jacket.`, garment_ids: []},
        headline: `you own no rain shell and rain is due on ${when}`,
    };
}

function coldGap(candidate: GarmentTags, closet: ClosetGarment[], days: DayForecast[], today: string): Gap | null {
    const cold = days.filter(d => d.temp_min_c <= COLD_DAY_C);
    if (!isWarmCoat(candidate) || closet.some(g => isWarmCoat(g.tags)) || cold.length === 0) return null;
    const coldest = cold.reduce((a, b) => (b.temp_min_c < a.temp_min_c ? b : a));
    const fahrenheit = Math.round((coldest.temp_min_c * 9) / 5 + 32);
    const drop = `it drops to ${fahrenheit}°F ${when(coldest.day, today)}`;
    return {
        reason: {code: "fills_weather_gap", message: `${drop[0].toUpperCase()}${drop.slice(1)} and you own no warm coat.`, garment_ids: []},
        headline: `you own no warm coat and ${drop}`,
    };
}

function eventGap(candidate: GarmentTags, closet: ClosetGarment[], occasion: Occasion): Gap | null {
    if (occasion.formality < FORMAL_EVENT_AT) return null;
    // Within one of the dress code is close enough to wear.
    const needed = occasion.formality - 1;
    const covered = closet.some(g => g.tags.category === candidate.category && g.tags.formality >= needed);
    if (covered || candidate.formality < needed) return null;
    const noun = NOUN[candidate.category];
    return {
        reason: {
            code: "fits_event",
            message: `${occasion.title} has dress code ${occasion.formality} of 5 and you have no ${noun} at ${needed} or above.`,
            garment_ids: [],
        },
        headline: `you have no ${noun} dressy enough for ${occasion.title}`,
    };
}

function isWet(day: DayForecast) {
    return day.precipitation_mm >= WET_DAY_MM || (day.precipitation_probability ?? 0) >= WET_DAY_CHANCE;
}

function isShell(tags: GarmentTags) {
    return tags.category === "outerwear" && tags.waterproof;
}

function isWarmCoat(tags: GarmentTags) {
    return tags.category === "outerwear" && tags.warmth >= WARM_COAT_AT_WARMTH;
}

// Say `day` the way a person would: today, tomorrow or on a weekday.
function when(day: string, today: string) {
    if (day === today) return "today";
    const tomorrow = new Date(`${today}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (day === tomorrow.toISOString().slice(0, 10)) return "tomorrow";
    return `on ${new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {weekday: "long", timeZone: "UTC"})}`;
}

function caveat(duplicates: ClosetGarment[], statement: boolean, pairings: ClosetGarment[]) {
    if (duplicates.length) return `it is close to your ${phrase(duplicates[0])}, so make sure it adds something`;
    if (statement) return "a bold print can clash with clothes that match it on paper, so see them together first";
    return `only ${pairings.length} ${pairings.length === 1 ? "thing you own goes" : "things you own go"} with it`;
}

const STATEMENT_REASON: Reason = {
    code: "statement_piece",
    message: "A bold print can clash with clothes that match it on paper, so see it on you first.",
    garment_ids: [],
};

function duplicatesReason(duplicates: ClosetGarment[]): Reason {
    return {code: "duplicates", message: `You already own ${duplicates.length} like it: ${listGarments(duplicates)}.`, garment_ids: duplicates.map(g => g.id)};
}

function pairingsReason(pairings: ClosetGarment[]): Reason {
    if (pairings.length === 0) {
        return {code: "few_pairings", message: "Nothing you own goes with it at a similar dressiness.", garment_ids: []};
    }
    if (pairings.length < VERSATILE_AT_PAIRINGS) {
        return {
            code: "few_pairings",
            message: `Only ${listGarments(pairings)} ${pairings.length === 1 ? "goes" : "go"} with it.`,
            garment_ids: pairings.map(g => g.id),
        };
    }
    return {
        code: "pairs_well",
        message: `It goes with ${pairings.length} things you own, best with your ${phrase(pairings[0])}.`,
        garment_ids: pairings.map(g => g.id),
    };
}

const colorWord = (color: string) => (color === "multi" ? "multicolor" : color);

function listGarments(garments: ClosetGarment[]) {
    const phrases = garments.map(g => `your ${phrase(g)}`);
    return phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

// The garment's description ready to sit mid-sentence.
export function phrase(garment: ClosetGarment) {
    const text = garment.tags.description.trim().replace(/\.$/, "");
    // Taggers write sentence case; lower the first letter unless the word is an acronym.
    return text.length > 1 && text[1] === text[1].toLowerCase() ? text[0].toLowerCase() + text.slice(1) : text;
}
