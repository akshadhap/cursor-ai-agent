"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { hubspotChannel } from "@/inngest/channels/hubspot";

export type HubSpotToken = Realtime.Token<
  typeof hubspotChannel,
  ["status"]
>;

export async function fetchHubSpotRealtimeToken(): Promise<HubSpotToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: hubspotChannel(),
    topics: ["status"],
  });

  return token;
}
