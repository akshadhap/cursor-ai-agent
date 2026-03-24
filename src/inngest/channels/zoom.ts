import { channel, topic } from "@inngest/realtime";

export const ZOOM_CHANNEL_NAME = "zoom";

export const zoomChannel = channel(ZOOM_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
