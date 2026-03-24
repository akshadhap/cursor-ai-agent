// src/inngest/channels/lead-outreach.ts
import { channel, topic } from "@inngest/realtime";

export const LEAD_OUTREACH_CHANNEL_NAME = "lead-outreach-execution";

export const leadOutreachChannel = channel(LEAD_OUTREACH_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    message?: string;
  }>(),
);
