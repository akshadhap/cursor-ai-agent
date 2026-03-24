// src/inngest/channels/lead-prioritizer.ts
import { channel, topic } from "@inngest/realtime";

export const LEAD_PRIORITIZER_CHANNEL_NAME = "lead-prioritizer-execution";

export const leadPrioritizerChannel = channel(LEAD_PRIORITIZER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    message?: string;
  }>(),
);
