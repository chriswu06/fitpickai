import NextAuth from "next-auth";
import {authConfig} from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {z} from "zod";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import {sql} from "@/app/lib/db";

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
        return user[0];
    } catch (error) {
        console.error("Failed to fetch user: ", error);
        throw new Error ("Failed to fetch user.");
    }
}

// Finds the users row for a Google account, creating one (with no password) on first sign-in.
async function findOrCreateGoogleUser(email: string, displayName: string | null | undefined): Promise<string> {
    const existing = await getUser(email);
    if (existing) return existing.id;
    const base = (displayName || email.split("@")[0]).trim().slice(0, 240) || "user";
    let name = base;
    for (let i = 2; !(await checkName(name)).isValid; i++) {
        name = `${base}${i}`;
    }
    const date = new Date().toISOString().split("T")[0];
    const [created] = await sql<{id: string}[]>`
        INSERT INTO users (name, email, password, date)
        VALUES (${name}, ${email}, ${null}, ${date})
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
    `;
    return created.id;
}

export const {handlers, auth, signIn, signOut} = NextAuth({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({account, profile}) {
            if (account?.provider === "google") {
                return !!profile?.email && profile.email_verified === true;
            }
            return true;
        },
        async jwt({token, user, account, profile}) {
            if (account?.provider === "google" && profile?.email) {
                token.sub = await findOrCreateGoogleUser(profile.email, profile.name);
            } else if (user?.id) {
                token.sub = user.id;
            }
            return token;
        },
    },
    providers: [
        // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
        Google,
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z.object({email: z.string().email(), password: z.string().min(1)}).safeParse(credentials);
                if (parsedCredentials.success) {
                    const {email, password} = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user?.password) return null; // Google-only accounts have no password
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return {id: user.id, name: user.name, email: user.email};
                }
                console.log("Invalid credentials");
                return null;
            }
        })
    ]
});

export async function checkName(name: string): Promise<{isValid: boolean; message? : string}> {
    if (!name || name.trim().length < 1) {
        return {isValid: false, message: "Name required"};
    }
    try {
        const user = await sql<{count: number}[]>`SELECT COUNT(*)::int AS count FROM users WHERE name=${name}`;
        if (user[0].count != 0) {
            return {isValid: false, message: "Name is already taken"};
        }
        return {isValid: true};
    } catch (error) {
        console.error("Error checking name availability: ", error);
        return {isValid: false, message: "Couldn't reach the database. Please try again later."};
    }
}

export async function checkEmail(email: string): Promise<{isValid: boolean; message? : string}> {
    if (!email) {
        return {isValid: false, message: "Email required"};
    }
    try {
        const user = await sql<{count: number}[]>`SELECT COUNT(*)::int AS count FROM users WHERE email=${email}`;
        if (user[0].count != 0) {
            return {isValid: false, message: "Email is already taken"};
        }
        return {isValid: true};
    } catch (error) {
        console.error("Error checking email availability: ", error);
        return {isValid: false, message: "Couldn't reach the database. Please try again later."};
    }
}

export function checkPassword(password: string, repassword: string): {isValid: boolean; message?: string} {
    if (!password || password.length < 11) {
        return {isValid: false, message: "Password must be at least 11 characters"};
    }
    if (password !== repassword) {
        return {isValid: false, message: "Passwords don't match"};
    }
    return {isValid: true};
}
