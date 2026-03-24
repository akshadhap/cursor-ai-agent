import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/slack
 * Initiate Slack OAuth flow
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const agentId = req.nextUrl.searchParams.get("agentId");
        if (!agentId) {
            return NextResponse.json(
                { error: "agentId is required" },
                { status: 400 }
            );
        }

        // Slack OAuth configuration
        const slackClientId = process.env.SLACK_CLIENT_ID;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/slack/callback`;

        if (!slackClientId) {
            return NextResponse.json(
                { error: "Slack OAuth not configured. Set SLACK_CLIENT_ID in environment variables." },
                { status: 500 }
            );
        }

        // Build Slack OAuth URL
        const authUrl = new URL("https://slack.com/oauth/v2/authorize");
        authUrl.searchParams.set("client_id", slackClientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", "chat:write,channels:read,users:read");
        authUrl.searchParams.set("state", agentId); // Pass agentId via state

        return NextResponse.redirect(authUrl.toString());
    } catch (error: any) {
        console.error("Slack OAuth error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate Slack OAuth" },
            { status: 500 }
        );
    }
}
