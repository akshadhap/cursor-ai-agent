// src/features/executions/components/agent/prioritizer/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { LEAD_PRIORITIZER_CHANNEL_NAME } from "@/inngest/channels/lead-prioritizer";
import { inngest } from "@/inngest/client";

export async function fetchLeadPrioritizerRealtimeToken(): Promise<Realtime.Subscribe.Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: LEAD_PRIORITIZER_CHANNEL_NAME,
    topics: ["status"],
  });

  return token;
}
