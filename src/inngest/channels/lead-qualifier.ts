// src/inngest/channels/lead-qualifier.ts
import { channel, topic } from "@inngest/realtime";

export const LEAD_QUALIFIER_CHANNEL_NAME = "lead-qualifier-execution";

export const leadQualifierChannel = channel(LEAD_QUALIFIER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    message?: string;
  }>(),
);
