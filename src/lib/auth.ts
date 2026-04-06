import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";
import { getPolarClientOrNull } from "./polar";
import { randomUUID } from "crypto"; 

// ✅ Convex imports
import { ConvexHttpClient } from "convex/browser"; // or "convex/node" depending on your setup
import { api } from "../../convex/_generated/api"; // adjust path

// Lazy initialization to avoid build-time errors
let convex: ConvexHttpClient | null = null;
function getConvexClient() {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convex && convexUrl) {
    convex = new ConvexHttpClient(convexUrl);
  }
  return convex;
}

// Conditionally build plugins based on Polar availability
const buildPlugins = () => {
  const polarClient = getPolarClientOrNull();
  
  if (!polarClient) {
    console.warn("[Auth] Polar client not available. Billing features will be disabled.");
    return [];
  }

  return [
    polar({
      client: polarClient,
      createCustomerOnSignUp: false, // Disabled - entity-based billing uses entityId as externalId
      use: [
        checkout({
          products: [
            {
              productId: "5607e0ef-7abe-4a63-a1ea-cdc4d5c85b5b",
              slug: "pro",
            },
          ],
          successUrl: process.env.POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ];
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: buildPlugins(),

  // ✅ THIS is what you want, not hooks.user
  databaseHooks: {
    user: {
      create: {
        async after(user, ctx) {
          // user here is the Better Auth user

          // Safeguard: don't crash auth if Convex is down
          try {
            const client = getConvexClient();
            if (client) {
              await client.mutation(api.users.add, {
                name: user.name ?? user.email,
                email: user.email,
                authId: user.id,
                entityId: randomUUID().replace(/-/g, "").slice(0, 5),
              });
            }
          } catch (e) {
            console.error("Failed to sync user to Convex:", e);
          }
        },
      },
    },
  },
});

// Helper: allow other server code to explicitly sync a user to Convex with a provided organizationId
export async function syncUserToConvexWithOrg({
  authId,
  email,
  name,
  organizationId,
}: {
  authId: string;
  email: string;
  name?: string | null;
  organizationId: string;
}) {
  try {
    const client = getConvexClient();
    if (!client) {
      console.warn("Convex client not configured — skipping sync");
      return;
    }

    // Use the same mutation as the create hook. Pass through the provided organizationId.
    await client.mutation(api.users.add, {
      name: name ?? email,
      email,
      authId,
      entityId: organizationId,
    });
  } catch (e) {
    console.error("Failed to sync user to Convex (explicit):", e);
    throw e;
  }
}
