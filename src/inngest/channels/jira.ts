import { channel, topic } from "@inngest/realtime";

export const JIRA_CHANNEL_NAME = "jira-execution";

export const jiraChannel = channel(JIRA_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error";
        }>(),
    );
