import type { NodeExecutor } from "@/features/executions/types";
import { mcpTriggerChannel } from "@/inngest/channels/mcp-trigger";

type McpTriggerData = Record<string, unknown>;

export const mcpTriggerExecutor: NodeExecutor<McpTriggerData> = async ({
    nodeId,
    context,
    step,
    publish,
}) => {
    await publish(
        mcpTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    const result = await step.run("mcp-trigger", async () => context);

    await publish(
        mcpTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
