// src/features/executions/components/agent/outreach/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { LEAD_OUTREACH_CHANNEL_NAME } from "@/inngest/channels/lead-outreach";
import { inngest } from "@/inngest/client";

export async function fetchLeadOutreachRealtimeToken(): Promise<Realtime.Subscribe.Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: LEAD_OUTREACH_CHANNEL_NAME,
    topics: ["status"],
  });

  return token;
}
