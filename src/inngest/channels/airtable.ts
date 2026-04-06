import { channel, topic } from "@inngest/realtime";

export const AIRTABLE_CHANNEL_NAME = "airtable";

export const airtableChannel = channel(AIRTABLE_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
