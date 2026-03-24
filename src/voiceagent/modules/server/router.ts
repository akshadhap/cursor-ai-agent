

import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { z } from "zod";
import apiClient from "@/lib/keycloak/interceptor";

/* -------------------------------------------------------
   ZOD SCHEMAS
------------------------------------------------------- */
const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  assistantId: z.string(),
  phone: z.string(),
  status: z.string(),
  type: z.string(),
});

const AssistantSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const PhoneSchema = z.object({
  id: z.string(),
  number: z.string(),
  assistant_id: z.string().nullable(),
});

const PhonesApiResponse = z.object({
  tenant_id: z.string(),
  phones: z.array(PhoneSchema),
});

const AssistantsApiResponse = z.object({
  tenant_id: z.string(),
  assistants: z.array(AssistantSchema),
});

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */
const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

/* -------------------------------------------------------
   ROUTER
------------------------------------------------------- */
export const voiceAgentsRouter = createTRPCRouter({
  /* -------------------------------------------
     LIST AGENTS
  ------------------------------------------- */
  list: publicProcedure
    .output(z.array(AgentSchema))
    .query(async () => {
      const [phonesRes, assistantsRes] = await Promise.all([
        apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
        apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
      ]);

      const phones = PhonesApiResponse.parse(phonesRes.data).phones;
      const assistants = AssistantsApiResponse.parse(
        assistantsRes.data
      ).assistants;

      const assistantMap = new Map(
        assistants.map((a) => [a.id, a.name])
      );

      return phones
        .filter((p) => p.assistant_id !== null)
        .map((p) => ({
          id: p.id,
          name: assistantMap.get(p.assistant_id!) ?? "Voice Agent",
          assistantId: p.assistant_id!,
          phone: p.number,
          status: "active",
          type: "Support",
        }));
    }),

  /* -------------------------------------------
     CREATE PHONE
  ------------------------------------------- */
  createPhone: publicProcedure
    .input(z.object({ name: z.string(), area_code: z.string() }))
    .mutation(async ({ input }) => {
      const res = await apiClient.post(
        `/voice/tenant/${TENANT_ID}/phone`,
        input
      );
      return res.data;
    }),

  /* -------------------------------------------
     CREATE ASSISTANT
  ------------------------------------------- */
  createAssistant: publicProcedure
    .input(
      z.object({
        name: z.string(),
        config: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const body = {
        name: input.name,
        entity_id: TENANT_ID,
        config: input.config,
      };

      const res = await apiClient.post(`/voice/assistant`, body);
      return res.data;
    }),

  /* -------------------------------------------
     UPLOAD KB  ✅ FIXED
  ------------------------------------------- */
  uploadKB: publicProcedure
    .input(
      z.object({
        assistantId: z.string(),
        kb_name: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        uploadUrl: `/voice/assistant/${input.assistantId}/upload_kb`,
      };
    }),

  /* -------------------------------------------
     ATTACH PHONE
  ------------------------------------------- */
  attachPhone: publicProcedure
    .input(
      z.object({
        assistant_id: z.string(),
        phone_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await apiClient.post(`/voice/attach_phone`, input);
      return res.data;
    }),

  /* -------------------------------------------
     REMOVE AGENT
  ------------------------------------------- */
  remove: publicProcedure
    .input(
      z.object({
        id: z.string(),
        assistantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await Promise.all([
        apiClient.delete(`/voice/phone/${input.id}`),
        apiClient.delete(`/voice/assistant/${input.assistantId}`),
      ]);

      return { success: true };
    }),
});
