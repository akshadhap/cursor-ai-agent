import { channel, topic } from "@inngest/realtime";

export const SMTP2GO_CHANNEL_NAME = "smtp2go-execution";

export const smtp2goChannel = channel(SMTP2GO_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
