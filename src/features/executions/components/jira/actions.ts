"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { jiraChannel } from "@/inngest/channels/jira";

export type JiraToken = Realtime.Token<
    typeof jiraChannel,
    ["status"]
>;

export async function fetchJiraRealtimeToken(): Promise<JiraToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: jiraChannel(),
        topics: ["status"],
    });

    return token;
}
