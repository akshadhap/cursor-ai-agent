import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

/**
 * Get cached emails from database
 * Returns stored emails without fetching from Gmail API
 * Use this for instant loading, then optionally sync in background
 * 
 * GET /api/standalone-agents/gmail-classifier/get-emails?agentId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
                { status: 400 }
            );
        }

        // Get agent with data
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: {
                data: true,
                config: true,
            },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentData = agent.data as any;
        const agentConfig = agent.config as any;

        // Return cached emails and metadata
        const emails = agentData?.emails || [];
        const lastSync = agentData?.lastSync || null;
        const stats = agentData?.stats || {};
        const syncPreferences = agentData?.syncPreferences || null;
        const isConnected = !!agentConfig?.accessToken;
        const gmailEmail = agentConfig?.gmailEmail || null;

        return NextResponse.json({
            emails,
            lastSync,
            stats,
            syncPreferences,
            isConnected,
            gmailEmail,
            cached: true,
            message: emails.length > 0
                ? `Loaded ${emails.length} cached emails`
                : "No cached emails found",
        });
    } catch (error) {
        console.error("Error getting cached emails:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get emails",
            },
            { status: 500 }
        );
    }
}
