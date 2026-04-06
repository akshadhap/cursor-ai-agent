"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { zohoCrmChannel } from "@/inngest/channels/zoho-crm";
import { inngest } from "@/inngest/client";

export type ZohoCrmToken = Realtime.Token<
    ReturnType<typeof zohoCrmChannel>,
    ["status"]
>;

export async function fetchZohoRealtimeToken(): Promise<ZohoCrmToken> {
    return getSubscriptionToken(inngest, {
        channel: zohoCrmChannel(),
        topics: ["status"],
    });
}

