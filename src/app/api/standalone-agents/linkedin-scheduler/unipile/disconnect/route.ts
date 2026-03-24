import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - Disconnect LinkedIn API Route
 * Removes LinkedIn connection from agent config
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { agentId } = body;

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        // Get agent and verify ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Remove unipileAccountId from config
        const currentConfig = (agent.config as Record<string, unknown>) || {};

        // Create new config without unipileAccountId
        const updatedConfig: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(currentConfig)) {
            if (key !== 'unipileAccountId') {
                updatedConfig[key] = value;
            }
        }

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        logger.info(`[Unipile Disconnect] Removed LinkedIn connection for agent ${agentId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Unipile Disconnect] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Disconnect failed" },
            { status: 500 }
        );
    }
}
