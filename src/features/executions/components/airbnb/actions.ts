"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { airbnbChannel } from "@/inngest/channels/airbnb";

export type AirbnbToken = Realtime.Token<
  typeof airbnbChannel,
  ["status"]
>;

export async function fetchAirbnbRealtimeToken(nodeId: string): Promise<AirbnbToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: airbnbChannel(),
    topics: ["status"],
  });

  return token;
}