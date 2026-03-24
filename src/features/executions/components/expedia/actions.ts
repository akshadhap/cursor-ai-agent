"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { expediaChannel } from "@/inngest/channels/expedia";

export type ExpediaToken = Realtime.Token<
  typeof expediaChannel,
  ["status"]
>;

export async function fetchExpediaRealtimeToken(nodeId: string): Promise<ExpediaToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: expediaChannel(),
    topics: ["status"],
  });

  return token;
}