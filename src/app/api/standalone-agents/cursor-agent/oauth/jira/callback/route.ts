import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { updateCursorAgentConfig } from "@/features/standalone-agents/agents/cursor-agent";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/jira/callback
 * Handle Jira OAuth callback
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
        const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: process.env.JIRA_CLIENT_ID!,
                client_secret: process.env.JIRA_CLIENT_SECRET!,
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/jira/callback`,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || "Failed to exchange OAuth code");
        }

        // Get accessible resources (Jira sites)
        const resourcesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
            headers: {
                "Authorization": `Bearer ${tokenData.access_token}`,
                "Accept": "application/json",
            },
        });

        const resources = await resourcesResponse.json();
        const primaryResource = resources[0]; // Use first available resource

        // Save token to agent config
        await updateCursorAgentConfig(agentId, {
            integrations: {
                jira: {
                    connected: true,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    cloudId: primaryResource?.id,
                    siteName: primaryResource?.name,
                    siteUrl: primaryResource?.url,
                },
            },
        });

        // Redirect back to agent dashboard
        const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId}`);
        redirectUrl.searchParams.set("oauth_success", "jira");
        return NextResponse.redirect(redirectUrl.toString());
    } catch (error: any) {
        console.error("Jira OAuth callback error:", error);

        const agentId = req.nextUrl.searchParams.get("state");
        const redirectUrl = new URL(
            `${process.env.NEXT_PUBLIC_APP_URL}/cognitive-agents/${agentId || "error"}`
        );
        redirectUrl.searchParams.set("oauth_error", "jira");
        return NextResponse.redirect(redirectUrl.toString());
    }
}
