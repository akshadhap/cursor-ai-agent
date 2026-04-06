import { channel, topic } from "@inngest/realtime";

export const CRON_TRIGGER_CHANNEL_NAME = "cron-trigger";

export const cronTriggerChannel = channel(CRON_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
