import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { updateCursorAgentConfig } from "@/features/standalone-agents/agents/cursor-agent";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/slack/callback
 * Handle Slack OAuth callback
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const code = req.nextUrl.searchParams.get("code");
        const agentId = req.nextUrl.searchParams.get("state");
        const error = req.nextUrl.searchParams.get("error");

        if (error) {
            const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId}`);
            redirectUrl.searchParams.set("oauth_error", error);
            return NextResponse.redirect(redirectUrl.toString());
        }

        if (!code || !agentId) {
            return NextResponse.json(
                { error: "Missing OAuth code or agentId" },
                { status: 400 }
            );
        }

        // Exchange code for access token
        const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/slack/callback`,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            throw new Error(tokenData.error || "Failed to exchange OAuth code");
        }

        // Save token to agent config
        await updateCursorAgentConfig(agentId, {
            integrations: {
                slack: {
                    connected: true,
                    accessToken: tokenData.access_token,
                    teamId: tokenData.team.id,
                    teamName: tokenData.team.name,
                    botUserId: tokenData.bot_user_id,
                },
            },
        });

        // Redirect back to agent dashboard
        const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId}`);
        redirectUrl.searchParams.set("oauth_success", "slack");
        return NextResponse.redirect(redirectUrl.toString());
    } catch (error: any) {
        console.error("Slack OAuth callback error:", error);

        const agentId = req.nextUrl.searchParams.get("state");
        const redirectUrl = new URL(
            `${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId || "error"}`
        );
        redirectUrl.searchParams.set("oauth_error", "slack");
        return NextResponse.redirect(redirectUrl.toString());
    }
}
