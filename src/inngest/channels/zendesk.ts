import { channel, topic } from "@inngest/realtime";

export const ZENDESK_CHANNEL_NAME = "zendesk";

export const zendeskChannel = channel(ZENDESK_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
      message?: string;
    }>(),
  );
