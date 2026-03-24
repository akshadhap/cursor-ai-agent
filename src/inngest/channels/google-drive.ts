import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_CHANNEL_NAME = "google-drive";

export const googleDriveChannel = channel(GOOGLE_DRIVE_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
