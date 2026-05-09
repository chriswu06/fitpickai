import NextAuth from "next-auth";
import {authConfig} from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import {z} from "zod";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, {ssl: "require"});

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await (sql<User[]>`SELECT * FROM users WHERE email=${email}` as unknown as Promise<User[]>);
        return user[0];
    } catch (error) {
        console.error("Failed to fetch user: ", error);
        throw new Error ("Failed to fetch user.");
    }
}

export const {auth, signIn, signOut} = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z.object({email: z.string().email(), password: z.string().min(11)}).safeParse(credentials);
                if (parsedCredentials.success) {
                    const {email, password} = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return user;
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
        const user = await (sql<{count: number}[]>`SELECT COUNT(*) FROM users WHERE name=${name}`);
        if (user[0].count != 0) {
            return {isValid: false, message: "Name is already taken"};
        }
        return {isValid: true};
    } catch (error) {
        console.error("Error checking name availability: ", error);
        return {isValid: false, message: "Error checking name availability"};
    }
}

export async function checkEmail(email: string): Promise<{isValid: boolean; message? : string}> {
    if (!email) {
        return {isValid: false, message: "Email required"};
    }
    try {
        const user = await (sql<{count: number}[]>`SELECT COUNT(*) FROM users WHERE email=${email}`);
        if (user[0].count != 0) {
            return {isValid: false, message: "Email is already taken"};
        }
        return {isValid: true};
    } catch (error) {
        console.error("Error checking email availability: ", error);
        return {isValid: false, message: "Error checking email availability"};
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