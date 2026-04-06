/**
 * Notion OAuth Connection Initiation
 * Starts the Notion OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { getNotionAuthUrl } from "@/lib/notion/oauth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId } = body;

        if (!agentId) {
            return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
        }

        // Check if Notion credentials are configured
        if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
            return NextResponse.json(
                { error: "Notion integration not configured. Please add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to environment variables." },
                { status: 500 }
            );
        }

        // Create state with agent ID for callback
        const state = Buffer.from(JSON.stringify({ agentId })).toString('base64');

        // Get the authorization URL
        const authUrl = getNotionAuthUrl(state);

        console.log("[Notion Connect] Generated auth URL for agent:", agentId);

        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error("[Notion Connect] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to start Notion connection" },
            { status: 500 }
        );
    }
}
