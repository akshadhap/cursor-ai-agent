// import { createTRPCRouter, publicProcedure } from "@/trpc/init";
// import { TRPCError } from "@trpc/server";
// import { z } from "zod";
// import apiClient from "@/lib/keycloak/interceptor";
// import { computeSpinabotSignature } from "@/lib/keycloak/keycloak-client";

// const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";
// // const TENANT_ID = "f1760e39-4e58-453c-8c7a-bc3a350dbd94";

// // const TENANT_ID="d204bed5-a5e2-4e9e-b267-3b10b4989ec0";


// const OutboundNumberSchema = z.object({
//   id: z.string(),
//   number: z.string(),
//   assistant_id: z.string(),
//   assistant_name: z.string(),
//   is_primary: z.boolean().optional(),
// });


// export const batchCallsRouter = createTRPCRouter({


// outboundNumbers: publicProcedure
//   .output(z.array(OutboundNumberSchema))   // ✔ FIXED
//   .query(async ({ ctx }) => {
//     if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//     const signature = await computeSpinabotSignature(ctx.token);

//     const [phonesRes, assistantsRes] = await Promise.all([
//       apiClient.get(`/voice/tenant/${TENANT_ID}/phones`, {
//         headers: {
//           Authorization: `Bearer ${ctx.token}`,
//           "X-Spinabot-Sign": signature,
//         },
//       }),
//       apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`, {
//         headers: {
//           Authorization: `Bearer ${ctx.token}`,
//           "X-Spinabot-Sign": signature,
//         },
//       }),
//     ]);

//     const phones = phonesRes.data?.phones ?? [];
//     const assistants = assistantsRes.data?.assistants ?? [];

//     const assistantMap: Record<string, string> = {};
//     assistants.forEach((a: any) => (assistantMap[a.id] = a.name));

//     return phones
//       .filter((p: any) => p.number && p.assistant_id)
//       .map((p: any) => ({
//         id: String(p.id),
//         number: p.number,
//         assistant_id: p.assistant_id,
//         assistant_name: assistantMap[p.assistant_id] || "Unknown Assistant",
//         is_primary: p.is_primary ?? false,
//       }));
//   }),


//   schedule: publicProcedure
//     .input(
//       z.object({
//         contacts: z.array(
//           z.object({
//             number: z.string(),
//             name: z.string(),
//           })
//         ),
//         assistant_id: z.string(),
//         phone_id: z.string(),
//         earliest_at: z.string(),
//         latest_at: z.string(),
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.post(
//         `/voice/batch_call/${TENANT_ID}`,
//         input,
//         {
//           headers: {
//             Authorization: `Bearer ${ctx.token}`,
//             "X-Spinabot-Sign": signature,
//           },
//         }
//       );

//       return res.data;
//     }),


// });



import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { z } from "zod";
import apiClient from "@/lib/keycloak/interceptor";

const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

const OutboundNumberSchema = z.object({
  id: z.string(),
  number: z.string(),
  assistant_id: z.string(),
  assistant_name: z.string(),
  is_primary: z.boolean().optional(),
});

export const batchCallsRouter = createTRPCRouter({

  // ---------------------------------------------------
  // OUTBOUND NUMBERS
  // ---------------------------------------------------
  outboundNumbers: publicProcedure
    .output(z.array(OutboundNumberSchema))
    .query(async () => {
      const [phonesRes, assistantsRes] = await Promise.all([
        apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
        apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
      ]);

      const phones = phonesRes.data?.phones ?? [];
      const assistants = assistantsRes.data?.assistants ?? [];

      const assistantMap: Record<string, string> = {};
      assistants.forEach((a: any) => {
        assistantMap[a.id] = a.name;
      });

      return phones
        .filter((p: any) => p.number && p.assistant_id)
        .map((p: any) => ({
          id: String(p.id),
          number: p.number,
          assistant_id: p.assistant_id,
          assistant_name: assistantMap[p.assistant_id] || "Unknown Assistant",
          is_primary: p.is_primary ?? false,
        }));
    }),

  // ---------------------------------------------------
  // SCHEDULE BATCH CALLS
  // ---------------------------------------------------
  schedule: publicProcedure
    .input(
      z.object({
        contacts: z.array(
          z.object({
            number: z.string(),
            name: z.string(),
          })
        ),
        assistant_id: z.string(),
        phone_id: z.string(),
        earliest_at: z.string(),
        latest_at: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await apiClient.post(
        `/voice/batch_call/${TENANT_ID}`,
        input
      );

      return res.data;
    }),
});
