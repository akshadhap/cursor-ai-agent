import { channel, topic } from "@inngest/realtime";

export const SENDGRID_CHANNEL_NAME = "sendgrid-execution";

export const sendgridChannel = channel(SENDGRID_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
