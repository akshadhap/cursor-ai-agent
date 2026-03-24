"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { hubspotTriggerChannel } from "@/inngest/channels/hubspot-trigger";
import { inngest } from "@/inngest/client";

export type HubspotTriggerToken = Realtime.Token<
    typeof hubspotTriggerChannel,
    ["status"]
>;

export async function fetchHubspotTriggerRealtimeToken(): Promise<HubspotTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: hubspotTriggerChannel(),
        topics: ["status"],
    });

    return token;
};
