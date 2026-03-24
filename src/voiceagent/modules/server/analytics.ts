// // analytics.router.ts

// import apiClient from "@/lib/keycloak/interceptor";
// import { computeSpinabotSignature } from "@/lib/keycloak/keycloak-client";
// import { createTRPCRouter, publicProcedure } from "@/trpc/init";
// import { TRPCError } from "@trpc/server";
// import { z } from "zod";

// const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";


// const artifactSchema = z.object({
//   id: z.number(),
//   call_id: z.string(),
//   tenant_id: z.string(),
//   created_at: z.string(),
//   ended_at: z.string(),
//   transcript: z.string(),
//   recording_url: z.string(),
//   performance_metrics: z.object({
//     turnLatencies: z.array(
//       z.object({
//         modelLatency: z.number(),
//         voiceLatency: z.number(),
//         transcriberLatency: z.number(),
//         endpointingLatency: z.number(),
//         turnLatency: z.number(),
//       })
//     ),
//     modelLatencyAverage: z.number(),
//     voiceLatencyAverage: z.number(),
//     transcriberLatencyAverage: z.number(),
//     endpointingLatencyAverage: z.number(),
//     turnLatencyAverage: z.number(),
//   }),
//   analysis: z.object({
//     summary: z.string(),
//     successEvaluation: z.string(),
//   }),
//   costs: z.array(
//     z.object({
//       type: z.string(),
//       cost: z.number(),
//     })
//   ),
// });

// export const analyticsRouter = createTRPCRouter({
//   artifacts: publicProcedure
//     .output(z.array(artifactSchema))
//     .query(async ({ ctx }) => {
//       if (!ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });

//       const signature = await computeSpinabotSignature(ctx.token);

//       const res = await apiClient.get(
//         `/voice/artifacts?tenant_id=${TENANT_ID}`,
//         {
//           headers: {
//             Authorization: `Bearer ${ctx.token}`,
//             "X-Spinabot-Sign": signature,
//           },
//         }
//       );

//       return res.data; // now type-safe
//     }),
// });




// analytics.router.ts

import apiClient from "@/lib/keycloak/interceptor";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { z } from "zod";

const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

const artifactSchema = z.object({
  id: z.number(),
  call_id: z.string(),
  tenant_id: z.string(),
  created_at: z.string(),
  ended_at: z.string(),
  transcript: z.string(),
  recording_url: z.string(),
  performance_metrics: z.object({
    turnLatencies: z.array(
      z.object({
        modelLatency: z.number(),
        voiceLatency: z.number(),
        transcriberLatency: z.number(),
        endpointingLatency: z.number(),
        turnLatency: z.number(),
      })
    ),
    modelLatencyAverage: z.number(),
    voiceLatencyAverage: z.number(),
    transcriberLatencyAverage: z.number(),
    endpointingLatencyAverage: z.number(),
    turnLatencyAverage: z.number(),
  }),
  analysis: z.object({
    summary: z.string(),
    successEvaluation: z.string(),
  }),
  costs: z.array(
    z.object({
      type: z.string(),
      cost: z.number(),
    })
  ),
});

export const analyticsRouter = createTRPCRouter({
  artifacts: publicProcedure
    .output(z.array(artifactSchema))
    .query(async () => {
      const res = await apiClient.get(
        `/voice/artifacts?tenant_id=${TENANT_ID}`
      );

      return res.data;
    }),
});
