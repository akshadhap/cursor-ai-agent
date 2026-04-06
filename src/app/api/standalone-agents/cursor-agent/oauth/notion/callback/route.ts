import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { updateCursorAgentConfig } from "@/features/standalone-agents/agents/cursor-agent";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/notion/callback
 * Handle Notion OAuth callback
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const code = req.nextUrl.searchParams.get("code");
        const agentId = req.nextUrl.searchParams.get("state"); // agentId passed via state
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
        const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(
                    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
                ).toString("base64")}`,
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/notion/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error("Failed to exchange OAuth code for token");
        }

        const tokenData = await tokenResponse.json();

        // Save token to agent config
        await updateCursorAgentConfig(agentId, {
            integrations: {
                notion: {
                    connected: true,
                    accessToken: tokenData.access_token,
                    workspaceId: tokenData.workspace_id,
                    workspaceName: tokenData.workspace_name,
                    botId: tokenData.bot_id,
                },
            },
        });

        // Redirect back to agent dashboard
        const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId}`);
        redirectUrl.searchParams.set("oauth_success", "notion");
        return NextResponse.redirect(redirectUrl.toString());
    } catch (error: any) {
        console.error("Notion OAuth callback error:", error);

        const agentId = req.nextUrl.searchParams.get("state");
        const redirectUrl = new URL(
            `${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId || "error"}`
        );
        redirectUrl.searchParams.set("oauth_error", "notion");
        return NextResponse.redirect(redirectUrl.toString());
    }
}
