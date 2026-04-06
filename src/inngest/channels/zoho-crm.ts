import { channel, topic } from "@inngest/realtime";

export const ZOHO_CRM_CHANNEL_NAME = "zoho-crm";

export const zohoCrmChannel = channel(ZOHO_CRM_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
