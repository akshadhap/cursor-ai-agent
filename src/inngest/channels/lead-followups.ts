// src/inngest/channels/lead-followups.ts
import { channel, topic } from "@inngest/realtime";

export const LEAD_FOLLOWUPS_CHANNEL_NAME = "lead-followups-execution";

export const leadFollowupsChannel = channel(LEAD_FOLLOWUPS_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    message?: string;
  }>(),
);
