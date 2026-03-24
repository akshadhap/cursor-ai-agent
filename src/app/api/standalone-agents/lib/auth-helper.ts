import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

/**
 * Require authentication for API routes
 * Throws an error if user is not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
    };
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(): Promise<AuthUser | null> {
    try {
        return await requireAuth();
    } catch {
        return null;
    }
}
