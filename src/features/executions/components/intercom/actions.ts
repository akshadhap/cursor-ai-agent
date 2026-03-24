"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { intercomChannel } from "@/inngest/channels/intercom";

export type IntercomToken = Realtime.Token<
  typeof intercomChannel,
  ["status"]
>;

export async function fetchIntercomRealtimeToken(): Promise<IntercomToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: intercomChannel(),
    topics: ["status"],
  });

  return token;
}
