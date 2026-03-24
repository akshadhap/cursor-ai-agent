// import { createTRPCRouter, publicProcedure } from "@/trpc/init";
// import { z } from "zod";
// import apiClient from "@/lib/keycloak/interceptor";
// import { computeSpinabotSignature } from "@/lib/keycloak/keycloak-client";
// import { TRPCError } from "@trpc/server";

// const TENANT_ID = "f1760e39-4e58-453c-8c7a-bc3a350dbd94";


// const ApiKeySchema = z.object({
//   id: z.string(),
//   tenant_id: z.string(),
//   description: z.string(),
//   created_at: z.string(),
//   revoked: z.boolean(),
//   expires_at: z.string().nullable(),
//   last_used: z.string().nullable(),
//   api_key: z.string().optional(), 
// });

// const CreateApiKeySchema = z.object({
//   api_key: z.string(),
//   id: z.string(),
//   tenant_id: z.string(),
//   created_at: z.string(),
// });


// export const apiKeysRouter = createTRPCRouter({

//   // LIST API KEYS
//   list: publicProcedure
//     .output(z.array(ApiKeySchema))
//     .query(async ({ ctx }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.get(
//         `/voice/tenant/${TENANT_ID}/api-keys`,
//         {
//           headers: {
//             Authorization: `Bearer ${ctx.token}`,
//             "X-Spinabot-Sign": signature,
//           },
//         }
//       );

//       console.log("LIST API KEYS RESPONSE:", res.data);

//       return res.data?.api_keys ?? [];
//     }),

//   // CREATE API KEY
//   create: publicProcedure
//     .input(z.object({ description: z.string().min(1) }))
//     .output(CreateApiKeySchema)
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.post(
//         `/voice/tenant/${TENANT_ID}/api-keys`,
//         null,
//         {
//           params: { description: input.description },
//           headers: {
//             Authorization: `Bearer ${ctx.token}`,
//             "X-Spinabot-Sign": signature,
//           },
//         }
//       );

//       console.log("CREATE API KEY RESPONSE:", res.data);

//       return res.data;
//     }),

//   // REVOKE API KEY
//   revoke: publicProcedure
//     .input(z.object({ keyId: z.string() }))
//     .output(z.object({ ok: z.boolean() }))
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       await apiClient.delete(
//         `/voice/tenant/${TENANT_ID}/api-keys/${input.keyId}`,
//         {
//           headers: {
//             Authorization: `Bearer ${ctx.token}`,
//             "X-Spinabot-Sign": signature,
//           },
//         }
//       );

//       return { ok: true };
//     }),
// });



import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { z } from "zod";
import apiClient from "@/lib/keycloak/interceptor";

const TENANT_ID = "f1760e39-4e58-453c-8c7a-bc3a350dbd94";

const ApiKeySchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  description: z.string(),
  created_at: z.string(),
  revoked: z.boolean(),
  expires_at: z.string().nullable(),
  last_used: z.string().nullable(),
  api_key: z.string().optional(),
});

const CreateApiKeySchema = z.object({
  api_key: z.string(),
  id: z.string(),
  tenant_id: z.string(),
  created_at: z.string(),
});

export const apiKeysRouter = createTRPCRouter({

  // -----------------------------------
  // LIST API KEYS
  // -----------------------------------
  list: publicProcedure
    .output(z.array(ApiKeySchema))
    .query(async () => {
      const res = await apiClient.get(
        `/voice/tenant/${TENANT_ID}/api-keys`
      );

      return res.data?.api_keys ?? [];
    }),

  // -----------------------------------
  // CREATE API KEY
  // -----------------------------------
  create: publicProcedure
    .input(z.object({ description: z.string().min(1) }))
    .output(CreateApiKeySchema)
    .mutation(async ({ input }) => {
      const res = await apiClient.post(
        `/voice/tenant/${TENANT_ID}/api-keys`,
        null,
        {
          params: { description: input.description },
        }
      );

      return res.data;
    }),

  // -----------------------------------
  // REVOKE API KEY
  // -----------------------------------
  revoke: publicProcedure
    .input(z.object({ keyId: z.string() }))
    .output(z.object({ ok: z.boolean() }))
    .mutation(async ({ input }) => {
      await apiClient.delete(
        `/voice/tenant/${TENANT_ID}/api-keys/${input.keyId}`
      );

      return { ok: true };
    }),
});
