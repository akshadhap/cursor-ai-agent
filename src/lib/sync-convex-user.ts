import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { randomUUID } from "crypto";

/**
 * Syncs a user to Convex after successful Keycloak login
 * Call this from your login route after authentication
 */
export async function syncUserToConvex(email: string) {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.warn("CONVEX_URL/NEXT_PUBLIC_CONVEX_URL not set, skipping Convex user sync");
    return;
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    
    // Check if user already exists
    const existingUsers = await convex.query(api.users.getMany);
    const userExists = existingUsers?.some((u: any) => u.email === email);
    
    if (!userExists) {
      // Create new user in Convex
      await convex.mutation(api.users.add, {
        name: email.split("@")[0],
        email: email,
        authId: email, // Using email as authId for Keycloak
        entityId: randomUUID().replace(/-/g, "").slice(0, 5),
      });
      
      console.log(`Created Convex user for ${email}`);
    }
  } catch (error) {
    console.error("Failed to sync user to Convex:", error);
    // Don't throw - allow login to proceed even if Convex sync fails
  }
}
