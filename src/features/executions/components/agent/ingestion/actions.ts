// src/features/executions/components/agent/ingestion/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { LEAD_INGESTION_CHANNEL_NAME } from "@/inngest/channels/lead-ingestion";
import { inngest } from "@/inngest/client";

export async function fetchLeadIngestionRealtimeToken(): Promise<Realtime.Subscribe.Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: LEAD_INGESTION_CHANNEL_NAME,
    topics: ["status"],
  });

  return token;
}


