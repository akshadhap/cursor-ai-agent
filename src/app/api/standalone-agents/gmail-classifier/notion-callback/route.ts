/**
 * Notion OAuth Callback Handler
 * Exchanges code for access token and stores in agent config
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, listDatabases } from "@/lib/notion/oauth";
import prisma from "@/lib/db";
import { createActivityLog } from "@/lib/activity-history";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Get the base URL for redirects (production URL in production, localhost otherwise)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Handle OAuth errors
        if (error) {
            console.error("[Notion Callback] OAuth error:", error);
            return NextResponse.redirect(`${appUrl}/standalone-agents?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return NextResponse.redirect(`${appUrl}/standalone-agents?error=missing_params`);
        }

        // Decode state to get agent ID
        let agentId: string;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            agentId = stateData.agentId;
        } catch (e) {
            console.error("[Notion Callback] Failed to parse state:", e);
            return NextResponse.redirect(`${appUrl}/standalone-agents?error=invalid_state`);
        }

        console.log("[Notion Callback] Processing for agent:", agentId);

        // Exchange code for tokens
        const tokenData = await exchangeCodeForTokens(code);

        console.log("[Notion Callback] Got tokens for workspace:", tokenData.workspaceName);

        // Fetch accessible databases
        let databases: { id: string; title: string; icon: string | null; url: string }[] = [];
        try {
            databases = await listDatabases(tokenData.accessToken);
            console.log(`[Notion Callback] Found ${databases.length} accessible databases`);
        } catch (dbError) {
            console.error("[Notion Callback] Failed to fetch databases:", dbError);
            // Continue without databases - user can refresh later
        }

        // Get existing agent config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.redirect(`${appUrl}/standalone-agents?error=agent_not_found`);
        }

        const existingConfig = (agent.config as any) || {};
        const existingTools = existingConfig.connectedTools || [];
        const existingLogs = existingConfig.activityLogs || [];

        // Create activity log for connection
        const activityLog = createActivityLog(
            'connection',
            'Notion Connected',
            `Connected to workspace: ${tokenData.workspaceName}. Found ${databases.length} databases.`,
            'success',
            { tool: 'notion', databaseCount: databases.length }
        );

        // Update agent config with Notion tokens and databases
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...existingConfig,
                    notion: {
                        accessToken: tokenData.accessToken,
                        workspaceId: tokenData.workspaceId,
                        workspaceName: tokenData.workspaceName,
                        workspaceIcon: tokenData.workspaceIcon,
                        botId: tokenData.botId,
                        connectedAt: new Date().toISOString(),
                        databases: databases, // Store fetched databases
                        selectedDatabaseId: databases.length > 0 ? databases[0].id : null, // Auto-select first
                    },
                    connectedTools: existingTools.includes('notion')
                        ? existingTools
                        : [...existingTools, 'notion'],
                    toolsCompleted: true,
                    activityLogs: [activityLog, ...existingLogs].slice(0, 100),
                },
            },
        });

        console.log("[Notion Callback] Successfully connected Notion for agent:", agentId);

        // Redirect back to agent with success indicator
        return NextResponse.redirect(`${appUrl}/cognitive-agents/${agentId}?notion_connected=true`);
    } catch (error) {
        console.error("[Notion Callback] Error:", error);
        const errorAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return NextResponse.redirect(`${errorAppUrl}/standalone-agents?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`);
    }
}
