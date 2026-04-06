"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { sendgridChannel } from "@/inngest/channels/sendgrid";
import { inngest } from "@/inngest/client";

export type SendgridToken = Realtime.Token<
  typeof sendgridChannel,
  ["status"]
>;

export async function fetchSendgridRealtimeToken(): Promise<SendgridToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: sendgridChannel(),
    topics: ["status"],
  });

  return token;
}
