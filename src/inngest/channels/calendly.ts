import { channel, topic } from "@inngest/realtime";

export const CALENDLY_CHANNEL_NAME = "calendly-execution";

export const calendlyChannel = channel(CALENDLY_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );