import { channel, topic } from "@inngest/realtime";

export const MCP_CLIENT_TOOL_CHANNEL_NAME = "mcp-client-tool";

export const mcpClientToolChannel = channel(MCP_CLIENT_TOOL_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
