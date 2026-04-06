import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { refreshJiraToken, isTokenExpired } from "@/lib/jira/oauth";

/**
 * Fetch Jira projects from the connected account
 * Automatically refreshes expired tokens
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId } = body;

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
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
            console.log("[Jira Projects] Missing credentials");
            return NextResponse.json(
                { error: "Jira not connected" },
                { status: 400 }
            );
        }

        // Check if token needs refresh
        let accessToken = jiraCredentials.accessToken;

        if (isTokenExpired(jiraCredentials.expiresAt)) {
            console.log("[Jira Projects] Token expired, refreshing...");

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

                console.log("[Jira Projects] Token refreshed successfully");
            } catch (refreshError) {
                console.error("[Jira Projects] Token refresh failed:", refreshError);
                return NextResponse.json(
                    { error: "Jira session expired. Please reconnect Jira." },
                    { status: 401 }
                );
            }
        }

        // Fetch projects from Jira API
        const baseUrl = `https://api.atlassian.com/ex/jira/${jiraCredentials.cloudId}/rest/api/3`;

        const response = await fetch(`${baseUrl}/project`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Jira Projects] API Error:", errorText);

            if (response.status === 401) {
                return NextResponse.json(
                    { error: "Jira session expired. Please reconnect Jira." },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: `Failed to fetch projects: ${response.status}` },
                { status: response.status }
            );
        }

        const projects = await response.json();

        // Map to simpler format
        const projectList = projects.map((project: any) => ({
            key: project.key,
            name: project.name,
            avatarUrl: project.avatarUrls?.["48x48"] || null,
            projectTypeKey: project.projectTypeKey,
        }));

        return NextResponse.json({
            projects: projectList,
            count: projectList.length,
        });
    } catch (error) {
        console.error("Error fetching Jira projects:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch Jira projects",
            },
            { status: 500 }
        );
    }
}

