"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { zoomChannel } from "@/inngest/channels/zoom";
import { inngest } from "@/inngest/client";

export type ZoomToken = Realtime.Token<
  typeof zoomChannel,
  ["status"]
>;

export async function fetchZoomRealtimeToken(): Promise<ZoomToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: zoomChannel(),
    topics: ["status"],
  });

  return token;
}
