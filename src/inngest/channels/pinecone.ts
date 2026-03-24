import { channel, topic } from "@inngest/realtime";

export const PINECONE_CHANNEL_NAME = "pinecone-execution";

export const pineconeChannel = channel(PINECONE_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
