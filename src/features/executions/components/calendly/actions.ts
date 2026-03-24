"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { calendlyChannel } from "@/inngest/channels/calendly";
import { inngest } from "@/inngest/client";

export type CalendlyToken = Realtime.Token<typeof calendlyChannel, ["status"]>;

export async function fetchCalendlyRealtimeToken(): Promise<CalendlyToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: calendlyChannel(),
    topics: ["status"],
  });

  return token;
}
