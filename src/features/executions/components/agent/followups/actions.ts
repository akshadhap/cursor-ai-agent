// src/features/executions/components/agent/followups/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { LEAD_FOLLOWUPS_CHANNEL_NAME } from "@/inngest/channels/lead-followups";
import { inngest } from "@/inngest/client";

export async function fetchLeadFollowupsRealtimeToken(): Promise<Realtime.Subscribe.Token> {
  const token = await getSubscriptionToken(inngest, {
    channel: LEAD_FOLLOWUPS_CHANNEL_NAME,
    topics: ["status"],
  });

  return token;
}
