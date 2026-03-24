import { channel, topic } from "@inngest/realtime";

export const MCP_CLIENT_CHANNEL_NAME = "mcp-client-execution";

export const mcpClientChannel = channel(MCP_CLIENT_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
