import { channel, topic } from "@inngest/realtime";

export const MCP_TRIGGER_CHANNEL_NAME = "mcp-trigger-execution";

export const mcpTriggerChannel = channel(MCP_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
