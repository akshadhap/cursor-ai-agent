/**
 * History API - Fetch and manage activity history
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

interface MessageHistory {
    id: string;
    type: "sent" | "received";
    senderName: string;
    content: string;
    timestamp: string;
    isAutoReply?: boolean;
}

interface AutomationHistory {
    id: string;
    type: "dm_reply" | "comment_reply" | "lead_capture";
    ruleName: string;
    triggerKeyword: string;
    recipientName: string;
    timestamp: string;
}

// GET - Fetch history
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

        const agentData = (agent.data as Record<string, unknown>) || {};

        // Get message history
        const messageHistory: MessageHistory[] = (agentData.messageHistory || []) as MessageHistory[];

        // Get automation history from processed comments/triggers
        const automationHistory: AutomationHistory[] = (agentData.automationHistory || []) as AutomationHistory[];

        return NextResponse.json({
            messageHistory: messageHistory.slice(0, 100), // Limit to 100 items
            automationHistory: automationHistory.slice(0, 100),
        });
    } catch (error) {
        console.error("[History API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch history" },
            { status: 500 }
        );
    }
}

// DELETE - Delete history item
export async function DELETE(req: NextRequest) {
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
        const { agentId, type, id } = body;

        if (!agentId || !type || !id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentData = (agent.data as Record<string, unknown>) || {};

        if (type === "message") {
            const messageHistory = ((agentData.messageHistory || []) as MessageHistory[])
                .filter(m => m.id !== id);

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    data: JSON.parse(JSON.stringify({ ...agentData, messageHistory })),
                },
            });
        } else if (type === "automation") {
            const automationHistory = ((agentData.automationHistory || []) as AutomationHistory[])
                .filter(a => a.id !== id);

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    data: JSON.parse(JSON.stringify({ ...agentData, automationHistory })),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[History API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete" },
            { status: 500 }
        );
    }
}
