import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - OAuth Callback Route
 * Handles redirect from Unipile after LinkedIn connection
 * 
 * Note: This callback comes from Unipile via ngrok, so we can't use session auth.
 * We validate the agentId and save the account_id directly.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
    // Use production URL from environment, fallback to localhost for development
    const browserBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const accountId = searchParams.get("account_id");
        const error = searchParams.get("error");

        logger.info(`[Unipile Callback] Received: agentId=${agentId}, accountId=${accountId}, error=${error}`);

        if (error) {
            console.error(`[Unipile Callback] Error from Unipile: ${error}`);
            return NextResponse.redirect(`${browserBaseUrl}/cognitive-agents/${agentId || ""}?error=${error}`);
        }

        if (!agentId || !accountId) {
            console.error("[Unipile Callback] Missing agentId or accountId");
            return NextResponse.redirect(`${browserBaseUrl}/cognitive-agents?error=missing_params`);
        }

        // Find the agent (no auth check - this is a webhook-style callback)
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            console.error(`[Unipile Callback] Agent not found: ${agentId}`);
            return NextResponse.redirect(`${browserBaseUrl}/cognitive-agents?error=agent_not_found`);
        }

        // Save account ID to agent config
        const config = agent.config as Record<string, unknown> || {};

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    unipileAccountId: accountId,
                },
            },
        });

        logger.info(`[Unipile Callback] ✅ Connected account ${accountId} for agent ${agentId}`);

        // Redirect back to the specific agent page with success message
        return NextResponse.redirect(`${browserBaseUrl}/cognitive-agents/${agentId}?connected=linkedin`);
    } catch (error) {
        console.error("[Unipile Callback] Error:", error);
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        return NextResponse.redirect(`${browserBaseUrl}/cognitive-agents/${agentId || ""}?error=callback_failed`);
    }
}
