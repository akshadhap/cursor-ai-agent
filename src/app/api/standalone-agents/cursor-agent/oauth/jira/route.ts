import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/jira
 * Initiate Jira OAuth flow
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

        // Jira OAuth configuration
        const jiraClientId = process.env.JIRA_CLIENT_ID;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/jira/callback`;

        if (!jiraClientId) {
            return NextResponse.json(
                { error: "Jira OAuth not configured. Set JIRA_CLIENT_ID in environment variables." },
                { status: 500 }
            );
        }

        // Build Jira OAuth URL
        const authUrl = new URL("https://auth.atlassian.com/authorize");
        authUrl.searchParams.set("audience", "api.atlassian.com");
        authUrl.searchParams.set("client_id", jiraClientId);
        authUrl.searchParams.set("scope", "read:jira-work write:jira-work");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", agentId); // Pass agentId via state
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("prompt", "consent");

        return NextResponse.redirect(authUrl.toString());
    } catch (error: any) {
        console.error("Jira OAuth error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate Jira OAuth" },
            { status: 500 }
        );
    }
}
