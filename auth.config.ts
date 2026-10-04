import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login"
    },
    callbacks: {
        authorized({auth, request: {nextUrl}}) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            } else if (isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }
            return true;
        },
        // token.sub holds our users.id (set in the jwt callback in auth.ts).
        session({session, token}) {
            if (token.sub && session.user) session.user.id = token.sub;
            return session;
        }
    },
    providers: [],
} satisfies NextAuthConfig;