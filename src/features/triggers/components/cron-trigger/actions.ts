"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { cronTriggerChannel } from "@/inngest/channels/cron-trigger";
import { inngest } from "@/inngest/client";

export type CronTriggerToken = Realtime.Token<
    typeof cronTriggerChannel,
    ["status"]
>;

export async function fetchCronTriggerRealtimeToken(): Promise<CronTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: cronTriggerChannel(),
        topics: ["status"],
    });

    return token;
};
