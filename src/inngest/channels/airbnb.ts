import { channel, topic } from "@inngest/realtime";

export const AIRBNB_CHANNEL_NAME = "airbnb";

export const airbnbChannel = channel(AIRBNB_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
