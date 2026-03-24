// import { createTRPCRouter, publicProcedure } from "@/trpc/init";
// import { z } from "zod";
// import apiClient from "@/lib/keycloak/interceptor";
// import { computeSpinabotSignature } from "@/lib/keycloak/keycloak-client";
// import { TRPCError } from "@trpc/server";

// const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";
// // const TENANT_ID = "f1760e39-4e58-453c-8c7a-bc3a350dbd94";

// // const TENANT_ID="d204bed5-a5e2-4e9e-b267-3b10b4989ec0";

// // Org ID: 92f28b0e-7dc8-4c14-9974-572674187741 · Entity ID: f1760e39-4e58-453c-8c7a-bc3a350dbd94

// const PhoneSchema = z.object({
//   id: z.string(),
//   number: z.string(),
//   assistant_id: z.string().nullable(),
//   is_primary: z.boolean().optional(),
// });

// const PhonesResponseSchema = z.object({
//   phones: z.array(PhoneSchema),
// });

// const AssistantSchema = z.object({
//   id: z.string(),
//   name: z.string(),
// });

// const AssistantsResponseSchema = z.object({
//   assistants: z.array(AssistantSchema),
// });

// export const callLogsRouter = createTRPCRouter({

//   // ---------------------------------------------------
//   //  LIST CALL LOGS
//   // ---------------------------------------------------
//   list: publicProcedure.query(async ({ ctx }) => {
//     if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//     const signature = await computeSpinabotSignature(ctx.token);

//     const res = await apiClient.get(`/voice/tenant/${TENANT_ID}/calls`, {
//       headers: {
//         Authorization: `Bearer ${ctx.token}`,
//         "X-Spinabot-Sign": signature,
//       },
//     });
//     const data = res.data;
//      if (Array.isArray(data)) return data;
//   if (Array.isArray(data?.calls)) return data.calls;

//   return [];
//    // return raw, transform in client
//   }),

  



// outboundNumbers: publicProcedure
//   .output(
//     z.object({
//       phones: PhonesResponseSchema,
//       assistants: AssistantsResponseSchema,
//     })
//   )
//   .query(async ({ ctx }) => {
//     if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//     const signature = await computeSpinabotSignature(ctx.token);

//     const [phones, assistants] = await Promise.all([
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

//     return {
//       phones: phones.data,
//       assistants: assistants.data,
//     };
//   }),



// transcript: publicProcedure
//   .input(z.object({ callId: z.string() }))
//   .query(async ({ ctx, input }) => {
//     if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//     const signature = await computeSpinabotSignature(ctx.token);

//     const res = await apiClient.get(`/voice/call/${input.callId}/transcript`, {
//       headers: {
//         Authorization: `Bearer ${ctx.token}`,
//         "X-Spinabot-Sign": signature,
//       },
//     });

//     return {
//       transcript: res.data?.transcript ?? "",
//     };
//   }),


//   // ---------------------------------------------------
//   //  DOWNLOAD RECORDING
//   // ---------------------------------------------------
//   recording: publicProcedure
//     .input(z.object({ callId: z.string() }))
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.get(`/voice/call/${input.callId}/recording`, {
//         headers: {
//           Authorization: `Bearer ${ctx.token}`,
//           "X-Spinabot-Sign": signature,
//         },
//         responseType: "blob",
//       });

//       return res.data;
//     }),

//   // ---------------------------------------------------
//   //  MAKE OUTBOUND CALL
//   // ---------------------------------------------------
//   makeCall: publicProcedure
//     .input(
//       z.object({
//         phone: z.string(),
//         customer: z.string(),
//         label: z.string().optional(),
//         phone_id: z.string(),
//         assistant_id: z.string(),
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.post(
//         `/voice/outbound/${TENANT_ID}`,
//         {
//           number: input.phone,
//           name: input.customer,
//           label: input.label ?? "Outbound call",
//           phone_id: input.phone_id,
//           assistant_id: input.assistant_id,
//         },
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

// const TENANT_ID = "d204bed5-a5e2-4e9e-b267-3b10b4989ec0";
const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";


export const callLogsRouter = createTRPCRouter({

  // ---------------------------------------------------
  // LIST CALL LOGS
  // ---------------------------------------------------
  list: publicProcedure.query(async () => {
    const res = await apiClient.get(
      `/voice/tenant/${TENANT_ID}/calls`
    );

    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.calls)) return data.calls;
    return [];
  }),

  // ---------------------------------------------------
  // OUTBOUND NUMBERS
  // ---------------------------------------------------
  outboundNumbers: publicProcedure
    .output(
      z.object({
        phones: z.any(),
        assistants: z.any(),
      })
    )
    .query(async () => {
      const [phones, assistants] = await Promise.all([
        apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
        apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
      ]);

      return {
        phones: phones.data,
        assistants: assistants.data,
      };
    }),

  // ---------------------------------------------------
  // TRANSCRIPT
  // ---------------------------------------------------
  transcript: publicProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ input }) => {
      const res = await apiClient.get(
        `/voice/call/${input.callId}/transcript`
      );

      return {
        transcript: res.data?.transcript ?? "",
      };
    }),

  // ---------------------------------------------------
  // DOWNLOAD RECORDING
  // ---------------------------------------------------
  recording: publicProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const res = await apiClient.get(
        `/voice/call/${input.callId}/recording`,
        { responseType: "blob" }
      );

      return res.data;
    }),

  // ---------------------------------------------------
  // MAKE OUTBOUND CALL
  // ---------------------------------------------------
  makeCall: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        customer: z.string(),
        label: z.string().optional(),
        phone_id: z.string(),
        assistant_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await apiClient.post(
        `/voice/outbound/${TENANT_ID}`,
        {
          number: input.phone,
          name: input.customer,
          label: input.label ?? "Outbound call",
          phone_id: input.phone_id,
          assistant_id: input.assistant_id,
        }
      );

      return res.data;
    }),
});
