// src/app/features/executions/components/wait/actions.ts
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { waitChannel } from "@/inngest/channels/wait";
import { inngest } from "@/inngest/client";

export type WaitToken = Realtime.Token<typeof waitChannel, ["status"]>;

export async function fetchWaitRealtimeToken(): Promise<WaitToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: waitChannel(),
    topics: ["status"],
  });

  return token;
}
