import prisma from "./db";

/**
 * Syncs a user to Prisma (PostgreSQL) after successful Keycloak login
 * Call this from your login route after authentication
 */
export async function syncUserToPrisma(email: string) {
  try {
    // Use upsert to handle both create and update cases
    await prisma.user.upsert({
      where: { email },
      update: {
        // Update emailVerified if needed
        emailVerified: true,
      },
      create: {
        id: email, // Using email as ID for Keycloak users
        name: email.split("@")[0],
        email: email,
        emailVerified: true, // Keycloak handles verification
      },
    });

    console.log(`Synced Prisma user for ${email}`);
  } catch (error) {
    console.error("Failed to sync user to Prisma:", error);
    // Don't throw - allow login to proceed even if Prisma sync fails
  }
}
