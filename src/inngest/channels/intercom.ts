import { channel, topic } from "@inngest/realtime";

export const INTERCOM_CHANNEL_NAME = "intercom";

export const intercomChannel = channel(INTERCOM_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
