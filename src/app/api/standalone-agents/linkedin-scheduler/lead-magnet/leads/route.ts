/**
 * Lead Magnet - Captured Leads API
 * Fetch leads captured via lead magnet automations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// GET - Fetch captured leads
export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Get captured leads from agent config
        const config = (agent.config as Record<string, unknown>) || {};
        const capturedLeads = (config.capturedLeads || []) as Array<{
            id: string;
            name: string;
            profileUrl: string;
            keyword: string;
            leadMagnetName: string;
            capturedAt: string;
            status: "sent" | "pending" | "failed";
        }>;

        return NextResponse.json({ success: true, leads: capturedLeads });
    } catch (error) {
        console.error("[Lead Magnet Leads] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Fetch failed" },
            { status: 500 }
        );
    }
}
