import {auth} from "@/auth";

export async function getCurrentUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be logged in.");
    return userId;
}
