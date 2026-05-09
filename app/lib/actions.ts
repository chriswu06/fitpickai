"use server";
import postgres from "postgres";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {signIn, auth, checkName, checkEmail, checkPassword} from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import bcrypt from "bcrypt";

const sql = postgres(process.env.POSTGRES_URL!, {
    ssl: "require"
});

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
            errors: validatedFields.error.flatten(i => i.message).fieldErrors,
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

const FormSchema = z.object({
    id: z.string(),
    userId: z.string(),
    date: z.string(),
    name: z.string().optional(),
    shirtImageUrl: z.string({message: "Please choose a valid shirt."}),
    pantsImageUrl: z.string({message: "Please choose a valid pair of pants or shorts."}),
    shoesImageUrl: z.string({message: "Please choose a valid pair of shoes."}),
    hatAccessoryImageUrl: z.string().optional(),
    glassesAccessoryImageUrl: z.string().optional(),
    earPiercingsAccessoryImageUrl: z.string().optional(),
    neckAccessoryImageUrl: z.string().optional(),
    wristAccessoryImageUrl: z.string().optional(),
    pantsAccessoryImageUrl: z.string().optional(),
    bagAccessoryImageUrl: z.string().optional(),
    personalRating: z.coerce.number().min(0).max(10, { message: "Please enter a rating between 1 and 10." }),
    rotationStatus: z.enum(["In rotation", "Out of rotation"], { message: "Please select a valid value for this outfit's rotation status."}),
});

const CreateOutfit = FormSchema.omit({id: true, userId: true, date: true});
const UpdateOutfit = FormSchema.omit({id: true, userId: true, date: true});

export type OutfitState = {
    errors?: {
        name?: string[];
        shirtImageUrl?: string[];
        pantsImageUrl?: string[];
        shoesImageUrl?: string[];
        hatAccessoryImageUrl?: string[];
        glassesAccessoryImageUrl?: string[];
        earPiercingsAccessoryImageUrl?: string[];
        neckAccessoryImageUrl?: string[];
        wristAccessoryImageUrl?: string[];
        pantsAccessoryImageUrl?: string[];
        bagAccessoryImageUrl?: string[];
        personalRating?: string[];
        rotationStatus?: string[];
    } | null;
    message?: string | null;
};

export async function createOutfit(prevState: OutfitState | undefined, formData: FormData): Promise<OutfitState | undefined> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to create an outfit.");
    }
    const userId = session.user.id;
    const userName = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const validatedFields = CreateOutfit.safeParse({
        name: formData.get("name"),
        shirtImageUrl: formData.get("shirtImageUrl"),
        pantsImageUrl: formData.get("pantsImageUrl"),
        shoesImageUrl: formData.get("shoesImageUrl"),
        hatAccessoryImageUrl: formData.get("hatAccessoryImageUrl"),
        glassesAccessoryImageUrl: formData.get("glassesAccessoryImageUrl"),
        earPiercingsAccessoryImageUrl: formData.get("earPiercingsAccessoryImageUrl"),
        neckAccessoryImageUrl: formData.get("neckAccessoryImageUrl"),
        wristAccessoryImageUrl: formData.get("wristAccessoryImageUrl"),
        pantsAccessoryImageUrl: formData.get("pantsAccessoryImageUrl"),
        bagAccessoryImageUrl: formData.get("bagAccessoryImageUrl"),
        personalRating: formData.get("personalRating"),
        rotationStatus: formData.get("rotationStatus")
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: `${validatedFields.error.flatten().fieldErrors}. Failed to create outfit.`
        };
    }
    const {name, shirtImageUrl, pantsImageUrl, shoesImageUrl, hatAccessoryImageUrl, glassesAccessoryImageUrl, earPiercingsAccessoryImageUrl, neckAccessoryImageUrl, wristAccessoryImageUrl, pantsAccessoryImageUrl, bagAccessoryImageUrl, personalRating, rotationStatus} = validatedFields.data;
    const date = new Date().toISOString().split("T")[0];
    try {
        await sql`
            INSERT INTO outfits (user_id, date, name, shirt_image_url, pants_image_url, shoes_image_url, hat_accessory_image_url, glasses_accessory_image_url, ear_piercings_accessory_image_url, neck_accessory_image_url, wrist_accessory_image_url, pants_accessory_image_url, bag_accessory_image_url, personal_rating, rotation_status)
            VALUES (${userId}, ${date}, ${name ?? `${userName}'s' Outfit - ${date}`}, ${shirtImageUrl}, ${pantsImageUrl}, ${shoesImageUrl}, ${hatAccessoryImageUrl ?? null}, ${glassesAccessoryImageUrl ?? null}, ${earPiercingsAccessoryImageUrl ?? null}, ${neckAccessoryImageUrl ?? null}, ${wristAccessoryImageUrl ?? null}, ${pantsAccessoryImageUrl ?? null}, ${bagAccessoryImageUrl ?? null}, ${personalRating}, ${rotationStatus})
        `;
    } catch (error) {
        console.error(error);
    }
    revalidatePath("/dashboard/outfits");
    redirect("/dashboard/outfits");
}

export async function updateOutfit(id: string, prevState: OutfitState, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to update an outfit.");
    }
    const userId = session.user.id;
    const userName = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const validatedFields = UpdateOutfit.safeParse({
        name: formData.get("name"),
        shirtImageUrl: formData.get("shirtImageUrl"),
        pantsImageUrl: formData.get("pantsImageUrl"),
        shoesImageUrl: formData.get("shoesImageUrl"),
        hatAccessoryImageUrl: formData.get("hatAccessoryImageUrl"),
        glassesAccessoryImageUrl: formData.get("glassesAccessoryImageUrl"),
        earPiercingsAccessoryImageUrl: formData.get("earPiercingsAccessoryImageUrl"),
        neckAccessoryImageUrl: formData.get("neckAccessoryImageUrl"),
        wristAccessoryImageUrl: formData.get("wristAccessoryImageUrl"),
        pantsAccessoryImageUrl: formData.get("pantsAccessoryImageUrl"),
        bagAccessoryImageUrl: formData.get("bagAccessoryImageUrl"),
        personalRating: formData.get("personalRating"),
        rotationStatus: formData.get("rotationStatus")
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to create outfit."
        };
    }
    const {name, shirtImageUrl, pantsImageUrl, shoesImageUrl, hatAccessoryImageUrl, glassesAccessoryImageUrl, earPiercingsAccessoryImageUrl, neckAccessoryImageUrl, wristAccessoryImageUrl, pantsAccessoryImageUrl, bagAccessoryImageUrl, personalRating, rotationStatus} = validatedFields.data;
    const date = new Date().toISOString().split("T")[0];
    try {
        await sql`
            UPDATE outfits
            SET name = ${name ?? `${userName}'s Outfit - Updated ${date}`}, shirt_image_url = ${shirtImageUrl}, pants_image_url = ${pantsImageUrl}, shoes_image_url = ${shoesImageUrl}, hat_accessory_image_url = ${hatAccessoryImageUrl ?? null}, glasses_accessory_image_url = ${glassesAccessoryImageUrl ?? null}, ear_piercings_accessory_image_url = ${earPiercingsAccessoryImageUrl ?? null}, neck_accessory_image_url = ${neckAccessoryImageUrl ?? null}, wrist_accessory_image_url = ${wristAccessoryImageUrl ?? null}, pants_accessory_image_url = ${pantsAccessoryImageUrl ?? null}, bag_accessory_image_url = ${bagAccessoryImageUrl ?? null}, personal_rating = ${personalRating}, rotation_status = ${rotationStatus}
            WHERE id = ${id}
        `;
    } catch (error) {
        console.log(error);
    }
    revalidatePath("/dashboard/outfits");
    redirect("/dashboard/outfits");
}

export async function deleteOutfit(id: string) {
    await sql`DELETE FROM outfits WHERE id = ${id}`;
    revalidatePath("/dashboard/outfits");
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