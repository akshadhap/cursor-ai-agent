import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/standalone-agents/cursor-agent/oauth/notion
 * Initiate Notion OAuth flow
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

        // Notion OAuth configuration
        const notionClientId = process.env.NOTION_CLIENT_ID;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/cursor-agent/oauth/notion/callback`;

        if (!notionClientId) {
            return NextResponse.json(
                { error: "Notion OAuth not configured. Set NOTION_CLIENT_ID in environment variables." },
                { status: 500 }
            );
        }

        // Build Notion OAuth URL
        const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
        authUrl.searchParams.set("client_id", notionClientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("owner", "user");
        authUrl.searchParams.set("state", agentId); // Pass agentId via state

        return NextResponse.redirect(authUrl.toString());
    } catch (error: any) {
        console.error("Notion OAuth error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate Notion OAuth" },
            { status: 500 }
        );
    }
}
