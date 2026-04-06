import type { NodeExecutor } from "@/features/executions/types";
import { cronTriggerChannel } from "@/inngest/channels/cron-trigger";

type CronTriggerData = {
    cronExpression?: string;
    timezone?: string;
    description?: string;
};

export const cronTriggerExecutor: NodeExecutor<CronTriggerData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
}) => {
    await publish(
        cronTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    // Parse the cron configuration
    const cronConfig = {
        expression: data?.cronExpression || "0 9 * * *",
        timezone: data?.timezone || "UTC",
        description: data?.description || "Scheduled trigger",
    };

    // Merge cron configuration into workflow context
    const mergedContext = {
        ...context,
        cronConfig,
        triggerType: "cron",
        triggeredAt: new Date().toISOString(),
    };

    const result = await step.run("cron-trigger", async () => mergedContext);

    await publish(
        cronTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
