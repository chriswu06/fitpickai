"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {after} from "next/server";
import {signIn, checkName, checkEmail, checkPassword} from "@/auth";
import {AuthError} from "next-auth";
import {z} from "zod";
import bcrypt from "bcrypt";
import {sql} from "@/app/lib/db";
import {requireUserId} from "@/app/lib/session";
import {OUTFIT_SLOTS, Outfit, OutfitImageColumn} from "@/app/lib/definitions";
import {isUploadedFile, validateImage, uploadOutfitImage, deleteOutfitImages} from "@/app/lib/storage";
import {tagUntaggedGarments} from "@/app/lib/closet";

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
    repassword: z.string(),
    date: z.string()
});

const CreateUser = UserSchema.omit({id: true, date: true});

export type UserState = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        repassword?: string[];
    } | null;
    message?: string | null;
}

export async function createUser(prevState: UserState | undefined, formData: FormData): Promise<UserState | undefined> {
    const validatedFields = CreateUser.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        repassword: formData.get("repassword")
    });
    if (!validatedFields.success) {
        return {
            errors: z.flattenError(validatedFields.error).fieldErrors,
            message: validatedFields.error.issues.map(i => i.message).join(", ")
        };
    }
    const {name, email, password, repassword} = validatedFields.data;
    const nameResponse = await checkName(name);
    if (!nameResponse.isValid) {
        return {
            errors: null,
            message: nameResponse.message
        };
    }
    const emailResponse = await checkEmail(email);
    if (!emailResponse.isValid) {
        return {
            errors: null,
            message: emailResponse.message
        };
    }
    const passwordResponse = checkPassword(password, repassword);
    if (!passwordResponse.isValid) {
        return {
            errors: null,
            message: passwordResponse.message
        }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const date = new Date().toISOString().split("T")[0];
    try {
        await sql`
        INSERT INTO users (name, email, password, date)
        VALUES (${name}, ${email}, ${hashedPassword}, ${date});
        `;
        await signIn("credentials", formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return {errors: null, message: "Invalid credentials."};
                default:
                    return {errors: null, message: "Something went wrong."};
            }
        }
        throw error;
    }
}

// Empty form values ("" or missing) become undefined so optional/required checks behave.
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const OutfitDetailsSchema = z.object({
    name: z.preprocess(blankToUndefined, z.string().trim().max(255, {message: "Name must be 255 characters or fewer."}).optional()),
    personalRating: z.preprocess(
        blankToUndefined,
        z.coerce.number({message: "Please select a rating."}).int().min(0, {message: "Please enter a rating between 0 and 10."}).max(10, {message: "Please enter a rating between 0 and 10."})
    ),
    rotationStatus: z.enum(["In rotation", "Out of rotation"], {message: "Please select a valid value for this outfit's rotation status."}),
});

export type OutfitState = {
    errors?: Partial<Record<string, string[]>> | null;
    message?: string | null;
};

function parseOutfitDetails(formData: FormData) {
    return OutfitDetailsSchema.safeParse({
        name: formData.get("name"),
        personalRating: formData.get("personalRating"),
        rotationStatus: formData.get("rotationStatus"),
    });
}

// Validates image inputs. `existing` is the outfit being edited, if any; required slots can fall back to it.
function collectImageFiles(formData: FormData, existing?: Outfit) {
    const files: {column: OutfitImageColumn; key: string; file: File}[] = [];
    const removals: OutfitImageColumn[] = [];
    const errors: Record<string, string[]> = {};
    for (const slot of OUTFIT_SLOTS) {
        const value = formData.get(slot.key);
        if (isUploadedFile(value)) {
            const problem = validateImage(value);
            if (problem) errors[slot.key] = [problem];
            else files.push({column: slot.column, key: slot.key, file: value});
        } else if (slot.required && !existing?.[slot.column]) {
            errors[slot.key] = [`Please upload a photo of your ${slot.label.toLowerCase()}.`];
        } else if (!slot.required && formData.get(`remove-${slot.key}`) === "on") {
            removals.push(slot.column);
        }
    }
    return {files, removals, errors};
}

async function uploadAll(userId: string, files: {column: OutfitImageColumn; key: string; file: File}[]) {
    const urls = await Promise.all(files.map(f => uploadOutfitImage(userId, f.key, f.file)));
    return Object.fromEntries(files.map((f, i) => [f.column, urls[i]])) as Partial<Record<OutfitImageColumn, string>>;
}

const today = () => new Date().toISOString().split("T")[0];

// Tag new clothing photos with the AI once the response has gone out, so saving never waits on it.
const tagInBackground = (userId: string) => after(() => tagUntaggedGarments(userId).catch(e => console.error("Tagging Error: ", e)));

// Wardrobe outfits reuse photos from other outfits, so only delete images no outfit points at anymore.
async function deleteUnusedImages(urls: (string | null | undefined)[]) {
    const candidates = [...new Set(urls.filter((u): u is string => !!u))];
    if (candidates.length === 0) return;
    const columns = sql(OUTFIT_SLOTS.map(s => s.column));
    const stillUsed = await sql<{url: string}[]>`
        SELECT u AS url FROM unnest(${candidates}::text[]) AS u
        WHERE EXISTS (SELECT 1 FROM outfits WHERE u IN (${columns}))
    `;
    const used = new Set(stillUsed.map(r => r.url));
    await deleteOutfitImages(candidates.filter(u => !used.has(u)));
}

export async function createOutfit(prevState: OutfitState | undefined, formData: FormData): Promise<OutfitState | undefined> {
    const userId = await requireUserId();
    const details = parseOutfitDetails(formData);
    const images = collectImageFiles(formData);
    const fieldErrors = {...(details.success ? {} : z.flattenError(details.error).fieldErrors), ...images.errors};
    if (!details.success || Object.keys(images.errors).length > 0) {
        return {errors: fieldErrors, message: "Missing or invalid fields. Failed to create outfit."};
    }
    const {name, personalRating, rotationStatus} = details.data;

    let uploaded: Partial<Record<OutfitImageColumn, string>> = {};
    try {
        uploaded = await uploadAll(userId, images.files);
    } catch (error) {
        console.error("Upload Error: ", error);
        return {errors: null, message: "Failed to upload images. Please try again."};
    }

    const date = today();
    try {
        const [user] = await sql<{name: string}[]>`SELECT name FROM users WHERE id = ${userId}`;
        const row = {
            user_id: userId,
            date,
            name: name ?? `${user?.name ?? "My"}'s outfit - ${date}`,
            personal_rating: personalRating,
            rotation_status: rotationStatus,
            ...Object.fromEntries(OUTFIT_SLOTS.map(s => [s.column, uploaded[s.column] ?? null])),
        };
        await sql.begin(async (tx) => {
            const [outfit] = await tx`INSERT INTO outfits ${tx(row)} RETURNING id`;
            await tx`
                INSERT INTO personal_ratings (user_id, outfit_id, date, rating)
                VALUES (${userId}, ${outfit.id}, ${date}, ${personalRating})
            `;
        });
    } catch (error) {
        console.error("Database Error: ", error);
        await deleteOutfitImages(Object.values(uploaded));
        return {errors: null, message: "Database error. Failed to create outfit."};
    }
    tagInBackground(userId);
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/outfits");
}

export async function updateOutfit(id: string, prevState: OutfitState | undefined, formData: FormData): Promise<OutfitState | undefined> {
    const userId = await requireUserId();
    const [existing] = await sql<Outfit[]>`SELECT * FROM outfits WHERE id = ${id} AND user_id = ${userId}`;
    if (!existing) {
        return {errors: null, message: "Outfit not found."};
    }
    const details = parseOutfitDetails(formData);
    const images = collectImageFiles(formData, existing);
    const fieldErrors = {...(details.success ? {} : z.flattenError(details.error).fieldErrors), ...images.errors};
    if (!details.success || Object.keys(images.errors).length > 0) {
        return {errors: fieldErrors, message: "Missing or invalid fields. Failed to update outfit."};
    }
    const {name, personalRating, rotationStatus} = details.data;

    let uploaded: Partial<Record<OutfitImageColumn, string>> = {};
    try {
        uploaded = await uploadAll(userId, images.files);
    } catch (error) {
        console.error("Upload Error: ", error);
        return {errors: null, message: "Failed to upload images. Please try again."};
    }

    const imageChanges: Partial<Record<OutfitImageColumn, string | null>> = {...uploaded};
    for (const column of images.removals) imageChanges[column] = null;
    const replacedUrls = Object.keys(imageChanges).map(c => existing[c as OutfitImageColumn]);

    const changes = {
        name: name ?? existing.name,
        personal_rating: personalRating,
        rotation_status: rotationStatus,
        ...imageChanges,
    };
    try {
        await sql.begin(async (tx) => {
            await tx`UPDATE outfits SET ${tx(changes)} WHERE id = ${id} AND user_id = ${userId}`;
            // Track rating history for the trend chart; one entry per day.
            await tx`
                INSERT INTO personal_ratings (user_id, outfit_id, date, rating)
                VALUES (${userId}, ${id}, ${today()}, ${personalRating})
                ON CONFLICT (user_id, outfit_id, date) DO UPDATE SET rating = EXCLUDED.rating
            `;
        });
    } catch (error) {
        console.error("Database Error: ", error);
        await deleteOutfitImages(Object.values(uploaded));
        return {errors: null, message: "Database error. Failed to update outfit."};
    }
    await deleteUnusedImages(replacedUrls);
    tagInBackground(userId);
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/outfits");
}

export async function deleteOutfit(id: string) {
    const userId = await requireUserId();
    const deleted = await sql.begin(async (tx) => {
        await tx`DELETE FROM personal_ratings WHERE outfit_id = ${id} AND user_id = ${userId}`;
        return tx<Outfit[]>`DELETE FROM outfits WHERE id = ${id} AND user_id = ${userId} RETURNING *`;
    });
    if (deleted[0]) {
        await deleteUnusedImages(OUTFIT_SLOTS.map(s => deleted[0][s.column]));
    }
    revalidatePath("/dashboard", "layout");
}

export async function followUser(targetId: string) {
    const userId = await requireUserId();
    if (targetId === userId) return;
    await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${userId}, ${targetId})
        ON CONFLICT DO NOTHING
    `;
    revalidatePath("/dashboard", "layout");
}

export async function unfollowUser(targetId: string) {
    const userId = await requireUserId();
    await sql`DELETE FROM follows WHERE follower_id = ${userId} AND following_id = ${targetId}`;
    revalidatePath("/dashboard", "layout");
}

const RatingSchema = z.coerce.number().int().min(0).max(10);

// Rate someone else's outfit. Re-rating replaces your previous rating.
export async function rateOutfit(outfitId: string, rating: number) {
    const userId = await requireUserId();
    const parsed = RatingSchema.safeParse(rating);
    if (!parsed.success) return {message: "Rating must be between 0 and 10."};
    const [outfit] = await sql`SELECT user_id FROM outfits WHERE id = ${outfitId}`;
    if (!outfit) return {message: "Outfit not found."};
    if (outfit.user_id === userId) return {message: "You can't rate your own outfit here. Edit it instead."};
    const date = today();
    await sql.begin(async (tx) => {
        await tx`
            INSERT INTO outfit_ratings (rater_id, outfit_id, rating, date)
            VALUES (${userId}, ${outfitId}, ${parsed.data}, ${date})
            ON CONFLICT (rater_id, outfit_id) DO UPDATE SET rating = EXCLUDED.rating, date = EXCLUDED.date
        `;
        // Trend history for the owner's dashboard; one entry per rater per day.
        await tx`
            INSERT INTO outfit_rating_history (rater_id, outfit_id, rating, date)
            VALUES (${userId}, ${outfitId}, ${parsed.data}, ${date})
            ON CONFLICT (rater_id, outfit_id, date) DO UPDATE SET rating = EXCLUDED.rating
        `;
    });
    revalidatePath("/dashboard", "layout");
    return {message: null};
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    try {
        await signIn("credentials", formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials.";
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}

export async function signInWithGoogle(formData: FormData) {
    const redirectTo = formData.get("redirectTo");
    await signIn("google", {redirectTo: typeof redirectTo === "string" ? redirectTo : "/dashboard"});
}

const MixSchema = z.object({
    name: z.preprocess(blankToUndefined, z.string().trim().max(255, {message: "Name must be 255 characters or fewer."}).optional()),
    personalRating: z.coerce.number({message: "Please select a rating."}).int().min(0).max(10),
    images: z.record(z.string(), z.string().url()),
});

// Saves a combination of existing wardrobe pieces as a new outfit. Every image must already belong
// to one of the user's outfits in the same slot, so nobody can attach someone else's photos.
export async function createOutfitFromWardrobe(input: {name?: string; personalRating: number; images: Partial<Record<OutfitImageColumn, string>>}) {
    const userId = await requireUserId();
    const parsed = MixSchema.safeParse(input);
    if (!parsed.success) return {message: parsed.error.issues[0]?.message ?? "Invalid outfit."};
    const {name, personalRating, images} = parsed.data;

    const row: Record<string, string | number | null> = {};
    for (const slot of OUTFIT_SLOTS) {
        const url = images[slot.column] ?? null;
        if (slot.required && !url) return {message: `Pick a ${slot.label.toLowerCase()}.`};
        if (url) {
            const [owned] = await sql`
                SELECT 1 FROM outfits WHERE user_id = ${userId} AND ${sql(slot.column)} = ${url} LIMIT 1
            `;
            if (!owned) return {message: `That ${slot.label.toLowerCase()} isn't in your wardrobe.`};
        }
        row[slot.column] = url;
    }

    const date = today();
    try {
        const [user] = await sql<{name: string}[]>`SELECT name FROM users WHERE id = ${userId}`;
        Object.assign(row, {
            user_id: userId,
            date,
            name: name ?? `${user?.name ?? "My"}'s outfit - ${date}`,
            personal_rating: personalRating,
            rotation_status: "In rotation",
        });
        await sql.begin(async (tx) => {
            const [outfit] = await tx`INSERT INTO outfits ${tx(row)} RETURNING id`;
            await tx`
                INSERT INTO personal_ratings (user_id, outfit_id, date, rating)
                VALUES (${userId}, ${outfit.id}, ${date}, ${personalRating})
            `;
        });
    } catch (error) {
        console.error("Database Error: ", error);
        return {message: "Database error. Failed to save outfit."};
    }
    tagInBackground(userId);
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/outfits");
}
