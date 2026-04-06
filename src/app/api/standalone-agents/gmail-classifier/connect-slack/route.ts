import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

/**
 * Connect Slack OAuth
 * POST /api/standalone-agents/gmail-classifier/connect-slack
 * Body: { agentId: string }
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth(); // Ensure user is authenticated

        const { agentId } = await req.json();

        if (!agentId) {
            return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
        }

        // Verify agent exists
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/standalone-agents/gmail-classifier/slack-callback`;
        const scopes = "chat:write,channels:read,users:read";

        if (!clientId) {
            return NextResponse.json({ error: "Slack client ID not configured" }, { status: 500 });
        }

        // Encode agentId in state (base64 JSON) - matches pattern from Gmail/Jira/Notion
        const state = Buffer.from(JSON.stringify({ agentId })).toString('base64');

        // Construct authorization URL
        const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

        console.log("[Connect Slack] Generated auth URL for agent:", agentId);

        return NextResponse.json({ url: authUrl });
    } catch (error) {
        console.error("[Connect Slack] Error initiating Slack OAuth:", error);
        return NextResponse.json({ error: "Failed to initiate Slack OAuth" }, { status: 500 });
    }
}

