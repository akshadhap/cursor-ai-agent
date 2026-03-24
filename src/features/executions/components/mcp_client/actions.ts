"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { mcpClientChannel } from "@/inngest/channels/mcp_client";
import { inngest } from "@/inngest/client";

export type McpClientToken = Realtime.Token<
  typeof mcpClientChannel,
  ["status"]
>;

export async function fetchMcpClientRealtimeToken(): Promise<McpClientToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: mcpClientChannel(),
    topics: ["status"],
  });

  return token;
}
