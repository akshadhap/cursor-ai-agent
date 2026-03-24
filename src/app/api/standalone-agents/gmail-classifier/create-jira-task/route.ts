import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { createJiraTaskFromEmail } from "@/lib/email-agent/jira-automation";
import { refreshJiraToken, isTokenExpired } from "@/lib/jira/oauth";

/**
 * Create a Jira task manually from an email
 * Automatically refreshes expired tokens
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, email, projectKey } = body;

        if (!agentId || !email || !projectKey) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get agent with Jira config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentConfig = agent.config as any;
        const jiraCredentials = agentConfig?.jira;

        if (!jiraCredentials?.accessToken || !jiraCredentials?.cloudId) {
            return NextResponse.json(
                { error: "Jira not connected" },
                { status: 400 }
            );
        }

        // Check if token needs refresh
        let accessToken = jiraCredentials.accessToken;

        if (isTokenExpired(jiraCredentials.expiresAt)) {
            console.log("[Jira Task] Token expired, refreshing...");

            if (!jiraCredentials.refreshToken) {
                return NextResponse.json(
                    { error: "Jira session expired. Please reconnect Jira." },
                    { status: 401 }
                );
            }

            try {
                const newTokens = await refreshJiraToken(jiraCredentials.refreshToken);
                accessToken = newTokens.accessToken;

                // Update stored tokens in DB
                await prisma.standaloneAgent.update({
                    where: { id: agentId },
                    data: {
                        config: {
                            ...agentConfig,
                            jira: {
                                ...jiraCredentials,
                                accessToken: newTokens.accessToken,
                                refreshToken: newTokens.refreshToken,
                                expiresAt: newTokens.expiresAt,
                            },
                        } as any,
                    },
                });

                console.log("[Jira Task] Token refreshed successfully");
            } catch (refreshError) {
                console.error("[Jira Task] Token refresh failed:", refreshError);
                return NextResponse.json(
                    { error: "Jira session expired. Please reconnect Jira." },
                    { status: 401 }
                );
            }
        }

        // Create Jira task with refreshed token
        const result = await createJiraTaskFromEmail(
            email,
            {
                accessToken: accessToken,
                cloudId: jiraCredentials.cloudId,
            },
            {
                projectKey,
                issueType: "Task",
                priority: email.priority === "high" || email.priority === "critical" ? "High" : "Medium",
            }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Failed to create Jira task" },
                { status: 500 }
            );
        }

        // Build issue URL
        const issueUrl = `${jiraCredentials.siteUrl}/browse/${result.issueKey}`;

        console.log(`[Jira Manual] Created task ${result.issueKey} for email: ${email.subject}`);

        return NextResponse.json({
            success: true,
            issueKey: result.issueKey,
            issueUrl,
        });
    } catch (error) {
        console.error("Error creating Jira task:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create Jira task",
            },
            { status: 500 }
        );
    }
}
