"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { mcpClientToolChannel } from "@/inngest/channels/mcp_client_tool";
import { inngest } from "@/inngest/client";

export type McpClientToolToken = Realtime.Token<typeof mcpClientToolChannel, ["status"]>;

export async function fetchMcpClientToolRealtimeToken(): Promise<McpClientToolToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: mcpClientToolChannel(),
    topics: ["status"],
  });

  return token;
}