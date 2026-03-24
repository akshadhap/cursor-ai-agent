// src/features/executions/components/agent/qualifier/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { LEAD_QUALIFIER_CHANNEL_NAME } from "@/inngest/channels/lead-qualifier";
import { inngest } from "@/inngest/client";

export async function fetchLeadQualifierRealtimeToken(): Promise<Realtime.Subscribe.Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: LEAD_QUALIFIER_CHANNEL_NAME,
    topics: ["status"],
  });

  return token;
}
