import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { exchangeSlackCode } from "@/lib/slack/api";
import { createActivityLog } from "@/lib/activity-history";

/**
 * Slack OAuth Callback
 * GET /api/standalone-agents/gmail-classifier/slack-callback
 */
export async function GET(req: NextRequest) {
    // Get the base URL for redirects (production URL in production, localhost otherwise)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
        const searchParams = req.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        console.log("[Slack Callback] Received callback", { code: !!code, state: !!state, error });

        if (error) {
            console.error("[Slack Callback] OAuth error:", error);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            console.error("[Slack Callback] Missing code or state");
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=missing_params`);
        }

        // Decode state to get agentId
        let agentId: string;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            agentId = stateData.agentId;
        } catch (e) {
            console.error("[Slack Callback] Failed to parse state:", e);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=invalid_state`);
        }

        console.log("[Slack Callback] Processing for agent:", agentId);

        // Exchange code for token
        const tokenData = await exchangeSlackCode(code);

        if (!tokenData.ok || !tokenData.access_token) {
            console.error("[Slack Callback] Token exchange failed:", tokenData.error);
            return NextResponse.redirect(`${appUrl}/cognitive-agents/${agentId}?error=slack_exchange_failed`);
        }

        console.log("[Slack Callback] Got tokens for team:", tokenData.team?.name);

        // Get existing agent config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=agent_not_found`);
        }

        const existingConfig = (agent.config as any) || {};
        const existingTools = existingConfig.connectedTools || [];
        const existingLogs = existingConfig.activityLogs || [];

        // Create activity log for connection
        const activityLog = createActivityLog(
            'connection',
            'Slack Connected',
            `Connected to workspace: ${tokenData.team?.name || 'Unknown'}`,
            'success',
            { tool: 'slack', teamId: tokenData.team?.id }
        );

        // Update agent config with Slack credentials
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...existingConfig,
                    slack: {
                        accessToken: tokenData.access_token,
                        botUserId: tokenData.bot_user_id,
                        teamName: tokenData.team?.name,
                        teamId: tokenData.team?.id,
                        connectedAt: new Date().toISOString()
                    },
                    connectedTools: existingTools.includes('slack')
                        ? existingTools
                        : [...existingTools, 'slack'],
                    activityLogs: [activityLog, ...existingLogs].slice(0, 100),
                },
            },
        });

        console.log("[Slack Callback] Successfully connected Slack for agent:", agentId);

        // Redirect back to agent page with success indicator
        return NextResponse.redirect(`${appUrl}/cognitive-agents/${agentId}?slack_connected=true`);

    } catch (error) {
        console.error("[Slack Callback] Error:", error);
        const errorAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return NextResponse.redirect(`${errorAppUrl}/cognitive-agents?error=slack_oauth_failed`);
    }
}
