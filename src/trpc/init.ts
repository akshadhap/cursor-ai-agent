// import { polarClient } from '@/lib/polar';
// import { initTRPC, TRPCError } from '@trpc/server';
// import { headers } from 'next/headers';
// import { cache } from 'react';
// import superjson from "superjson";
// import { cookies } from "next/headers";

// /* ---------------------------------------------------------
//    Helper to get user from Keycloak token
// --------------------------------------------------------- */

// async function getUserFromToken() {
//   const cookieStore = await cookies();
//   const accessToken = cookieStore.get("access_token")?.value;
//   const email = cookieStore.get("email")?.value;

//   if (!accessToken || !email) {
//     return null;
//   }

//   // Create a session-like object matching the expected format
//   return {
//     user: {
//       id: email,
//       email: email,
//       name: email.split("@")[0],
//       image: null,
//       emailVerified: true,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     },
//     token: accessToken,
//   };
// }

// export const createTRPCContext = cache(async () => {
//   /**
//    * @see: https://trpc.io/docs/server/context
//    */
//   return { userId: 'user_123' };
// });
// // Avoid exporting the entire t-object
// // since it's not very descriptive.
// // For instance, the use of a t variable
// // is common in i18n libraries.
// const t = initTRPC.create({
//   /**
//    * @see https://trpc.io/docs/server/data-transformers
//    */
//   transformer: superjson,
// });
// // Base router and procedure helpers
// export const createTRPCRouter = t.router;
// export const createCallerFactory = t.createCallerFactory;
// export const baseProcedure = t.procedure;
// export const publicProcedure = baseProcedure;

// export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
//   const session = await getUserFromToken();

//   if (!session) {
//     throw new TRPCError({
//       code: "UNAUTHORIZED",
//       message: "Unauthorized",
//     });
//   }

//   return next({ ctx: { ...ctx, auth: session } });
// });

// export const premiumProcedure = protectedProcedure.use(
//   async ({ ctx, next }) => {
//     // Check if subscription enforcement is enabled
//     const enforceSubscriptions = process.env.ENFORCE_SUBSCRIPTIONS === "true";

//     try {
//       const customer = await polarClient.customers.getStateExternal({
//         externalId: ctx.auth.user.id,
//       });

//       const hasActiveSubscription =
//         customer.activeSubscriptions &&
//         customer.activeSubscriptions.length > 0;

//       if (enforceSubscriptions && !hasActiveSubscription) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "Active subscription required. Please upgrade to continue.",
//         });
//       }

//       if (!hasActiveSubscription) {
//         console.warn(
//           `User ${ctx.auth.user.email} has no active subscription, but proceeding (enforcement disabled)`
//         );
//       }

//       return next({ ctx: { ...ctx, customer } });
//     } catch (error) {
//       // If Polar.sh customer doesn't exist
//       if (enforceSubscriptions) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "Active subscription required. Please upgrade to continue.",
//         });
//       }

//       console.warn(
//         `Could not fetch customer from Polar.sh for ${ctx.auth.user.email}, proceeding without subscription check (enforcement disabled)`
//       );
//       return next({ ctx: { ...ctx, customer: null } });
//     }
//   }
// );



import { getPolarClient } from "@/lib/polar";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { cookies } from "next/headers";
import { syncUserToPrisma } from "@/lib/sync-prisma-user";

/* ---------------------------------------------------------
   Helper to get user from Keycloak token
--------------------------------------------------------- */
async function getUserFromToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const email = cookieStore.get("email")?.value;

  if (!accessToken || !email) return null;

  return {
    user: {
      id: email,
      email: email,
      name: email.split("@")[0],
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    token: accessToken,
  };
}

/* ---------------------------------------------------------
   TRPC Context
--------------------------------------------------------- */
export const createTRPCContext = cache(async () => {
  const session = await getUserFromToken();
  if (session?.user?.email) {
    // Ensure the user exists in Prisma (required for FK constraints)
    await syncUserToPrisma(session.user.email).catch(() => {});
  }

  return {
    auth: session,          // full session object
    token: session?.token,  // direct token access (IMPORTANT)
  };
});

/* ---------------------------------------------------------
   TRPC Init
--------------------------------------------------------- */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/* ---------------------------------------------------------
   Procedures
--------------------------------------------------------- */

// 🌍 Public — no auth required
export const publicProcedure = t.procedure;

// 🔐 Protected — token required
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return next({ ctx });
});

// 💎 Premium — just token required (subscription checks removed)
export const premiumProcedure = protectedProcedure;
