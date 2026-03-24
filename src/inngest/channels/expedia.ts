import { channel, topic } from "@inngest/realtime";

export const EXPEDIA_CHANNEL_NAME = "expedia";

export const expediaChannel = channel(EXPEDIA_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
