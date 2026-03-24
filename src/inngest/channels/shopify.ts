import { channel, topic } from "@inngest/realtime";

export const SHOPIFY_CHANNEL_NAME = "shopify";

export const shopifyChannel = channel(SHOPIFY_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
    );