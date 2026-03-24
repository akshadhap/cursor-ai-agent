import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { exchangeCodeForTokens, getAccessibleResources } from "@/lib/jira/oauth";
import { createActivityLog } from "@/lib/activity-history";

/**
 * Jira OAuth Callback
 * GET /api/standalone-agents/gmail-classifier/jira-callback
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        console.log("[Jira Callback] Received callback", { code: !!code, state: !!state, error });

        // Get the base URL for redirects (production URL in production, localhost otherwise)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (error) {
            console.error("[Jira Callback] OAuth error:", error);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            console.error("[Jira Callback] Missing code or state");
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=missing_params`);
        }

        // Decode state to get agentId
        const { agentId } = JSON.parse(Buffer.from(state, "base64").toString());
        console.log("[Jira Callback] Decoded state:", { agentId });

        // Get current agent to merge config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true },
        });

        if (!agent) {
            console.error("[Jira Callback] Agent not found:", agentId);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=agent_not_found`);
        }

        console.log("[Jira Callback] Found agent, current config:", agent.config);

        const currentConfig = (agent.config as any) || {};

        // Exchange code for tokens
        console.log("[Jira Callback] Exchanging code for tokens...");
        const tokens = await exchangeCodeForTokens(code);

        // Get accessible resources (Jira sites)
        console.log("[Jira Callback] Getting accessible resources...");
        const resources = await getAccessibleResources(tokens.accessToken);

        if (!resources || resources.length === 0) {
            console.error("[Jira Callback] No Jira sites found");
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=no_jira_sites`);
        }

        // Use the first accessible resource
        const resource = resources[0];
        console.log("[Jira Callback] Using resource:", resource.name);

        // Create activity log for connection
        const activityLog = createActivityLog(
            'connection',
            'Jira Connected',
            `Connected to Jira site: ${resource.name}`,
            'success',
            { tool: 'jira' }
        );

        // Get existing activity logs
        const existingLogs = currentConfig.activityLogs || [];

        // Merge with existing config to avoid overwriting
        const updatedConfig = {
            ...currentConfig,
            jira: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
                scope: tokens.scope,
                cloudId: resource.id,
                siteUrl: resource.url,
                siteName: resource.name,
            },
            connectedTools: Array.from(new Set([...(currentConfig.connectedTools || []), 'jira'])),
            activityLogs: [activityLog, ...existingLogs].slice(0, 100), // Add new log at start
        };

        console.log("[Jira Callback] Updating agent with config:", updatedConfig);

        // Update agent with Jira credentials - FIX: Prisma JSON fields need explicit typing
        const updated = await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: updatedConfig as any,
            },
        });

        console.log("[Jira Callback] Agent updated successfully!");

        // Redirect back to agent page (email dashboard)
        return NextResponse.redirect(`${appUrl}/cognitive-agents/${agentId}?jira_connected=true`);
    } catch (error) {
        console.error("[Jira Callback] Error:", error);
        const errorAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return NextResponse.redirect(`${errorAppUrl}/cognitive-agents?error=oauth_failed`);
    }
}
