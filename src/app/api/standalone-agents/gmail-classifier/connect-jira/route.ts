import { NextRequest, NextResponse } from "next/server";
import { getJiraAuthUrl } from "@/lib/jira/oauth";

/**
 * Initiate Jira OAuth Connection
 * POST /api/standalone-agents/gmail-classifier/connect-jira
 */
export async function POST(req: NextRequest) {
    try {
        const { agentId } = await req.json();

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
                { status: 400 }
            );
        }

        // Create state parameter with agentId
        const state = Buffer.from(JSON.stringify({ agentId })).toString("base64");

        // Generate Jira OAuth URL
        const authUrl = getJiraAuthUrl(state);

        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error("Connect Jira error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to connect Jira" },
            { status: 500 }
        );
    }
}
