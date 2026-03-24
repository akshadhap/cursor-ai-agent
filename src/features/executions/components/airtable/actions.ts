"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { airtableChannel } from "@/inngest/channels/airtable";

export type AirtableToken = Realtime.Token<
  typeof airtableChannel,
  ["status"]
>;

export async function fetchAirtableRealtimeToken(): Promise<AirtableToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: airtableChannel(),
    topics: ["status"],
  });

  return token;
}
