"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { smtp2goChannel } from "@/inngest/channels/smtp2go";
import { inngest } from "@/inngest/client";

export type Smtp2goToken = Realtime.Token<
  typeof smtp2goChannel,
  ["status"]
>;

export async function fetchSmtp2goRealtimeToken(): Promise<Smtp2goToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: smtp2goChannel(),
    topics: ["status"],
  });

  return token;
}
