"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { zendeskChannel } from "@/inngest/channels/zendesk";
import { inngest } from "@/inngest/client";

export type ZendeskToken = Realtime.Token<typeof zendeskChannel, ["status"]>;

export async function fetchZendeskRealtimeToken(): Promise<ZendeskToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: zendeskChannel(),
    topics: ["status"],
  });

  return token;
}
