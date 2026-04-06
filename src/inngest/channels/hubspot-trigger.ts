import { channel, topic } from "@inngest/realtime";

export const HUBSPOT_TRIGGER_CHANNEL_NAME = "hubspot-trigger";

export const hubspotTriggerChannel = channel(HUBSPOT_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
