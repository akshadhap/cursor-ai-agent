"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { pineconeChannel } from "@/inngest/channels/pinecone";

export type PineconeToken = Realtime.Token<
    typeof pineconeChannel,
    ["status"]
>;

export async function fetchPineconeRealtimeToken(): Promise<PineconeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: pineconeChannel(),
        topics: ["status"],
    });

    return token;
}
