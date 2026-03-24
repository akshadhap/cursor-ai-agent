import { channel, topic } from "@inngest/realtime";

export const LEAD_INGESTION_CHANNEL_NAME = "lead-ingestion-execution";

export const leadIngestionChannel = channel(LEAD_INGESTION_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
      message?: string;
    }>(),
  );
