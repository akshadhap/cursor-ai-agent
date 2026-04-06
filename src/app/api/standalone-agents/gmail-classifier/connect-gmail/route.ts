import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { getGmailOAuthUrl } from "@/lib/gmail/oauth";

/**
 * Connect Gmail OAuth
 * Initiates OAuth flow by redirecting to Google consent screen
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await req.json();
        const { agentId, provider } = body;

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
                { status: 400 }
            );
        }

        // Verify agent belongs to user
        const agent = await prisma.standaloneAgent.findFirst({
            where: {
                id: agentId,
                userId: userId as string,
            },
        });

        if (!agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        // Generate OAuth URL
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/standalone-agents/gmail-classifier/oauth-callback`;

        const authUrl = getGmailOAuthUrl(redirectUri);

        // Store agent ID AND provider in state for callback
        const state = Buffer.from(JSON.stringify({ agentId, provider: provider || 'gmail' })).toString("base64");
        const authUrlWithState = `${authUrl}&state=${state}`;

        return NextResponse.json({
            authUrl: authUrlWithState,
            message: "Redirect user to this URL",
        });
    } catch (error) {
        console.error("Error initiating Gmail OAuth:", error);
        return NextResponse.json(
            { error: "Failed to initiate OAuth" },
            { status: 500 }
        );
    }
}
