"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { mcpTriggerChannel } from "@/inngest/channels/mcp-trigger";

export type McpTriggerToken = Realtime.Token<
    typeof mcpTriggerChannel,
    ["status"]
>;

export async function fetchMcpTriggerRealtimeToken(): Promise<McpTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: mcpTriggerChannel(),
        topics: ["status"],
    });

    return token;
}
