import type { NodeExecutor } from "@/features/executions/types";
import { hubspotTriggerChannel } from "@/inngest/channels/hubspot-trigger";

type HubspotTriggerData = Record<string, unknown>;

export const hubspotTriggerExecutor: NodeExecutor<HubspotTriggerData> = async ({
    nodeId,
    context,
    step,
    publish,
}) => {
    await publish(
        hubspotTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    const result = await step.run("hubspot-trigger", async () => context);

    await publish(
        hubspotTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
