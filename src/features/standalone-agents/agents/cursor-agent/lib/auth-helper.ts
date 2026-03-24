/**
 * Auth helpers for Cursor Agent API routes
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export interface AuthenticatedUser {
    id: string;
    email: string;
    name?: string | null;
}

/**
 * Get authenticated user from Better Auth session
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return null;
        }

        return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        };
    } catch (error) {
        console.error("[Auth] Failed to get session:", error);
        return null;
    }
}

/**
 * Require authenticated user or throw error
 * Use this in API routes that require authentication
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getAuthenticatedUser();
    return user !== null;
}
