import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Reset Automation - Debug/Testing Endpoint
 * Clears the automationReplied list so you can test again
 * 
 * Use with: POST /api/standalone-agents/linkedin-scheduler/reset
 * Body: { "agentId": "xxx", "action": "reset_replied" }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST - Reset automation replied list
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, action, secret } = body;

        // Simple secret check for testing (optional)
        const resetSecret = process.env.CRON_SECRET || "test123";

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const safety = (config.safety as Record<string, unknown>) || {};

        if (action === "reset_replied") {
            // Clear the automationReplied list and set reset timestamp
            // Messages before this time will be ignored
            const resetTime = new Date().toISOString();
            const updatedSafety = {
                ...safety,
                automationReplied: [],
                lastResetTime: resetTime, // Only process messages after this time
            };

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({
                        ...config,
                        safety: updatedSafety,
                    })),
                },
            });

            logger.info("[Reset] Cleared automationReplied list for agent", agentId, "at", resetTime);
            return NextResponse.json({
                success: true,
                message: "Replied chats list cleared. You can test automation again!",
                resetTime,
            });
        }

        if (action === "reset_queue") {
            // Clear the message queue
            const data = (agent.data as Record<string, unknown>) || {};

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    data: JSON.parse(JSON.stringify({
                        ...data,
                        messageQueue: [],
                    })),
                },
            });

            logger.info("[Reset] Cleared message queue for agent", agentId);
            return NextResponse.json({
                success: true,
                message: "Message queue cleared!"
            });
        }

        if (action === "set_trial_start") {
            // Set trial start date for existing agents
            const trialStartDate = new Date().toISOString();

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({
                        ...config,
                        trialStartDate,
                    })),
                },
            });

            logger.info("[Reset] Set trial start date for agent", agentId, "to", trialStartDate);
            return NextResponse.json({
                success: true,
                message: "Trial start date set!",
                trialStartDate,
            });
        }

        return NextResponse.json({ error: "Invalid action. Use 'reset_replied', 'reset_queue', or 'set_trial_start'" }, { status: 400 });
    } catch (error) {
        console.error("[Reset] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Reset failed" },
            { status: 500 }
        );
    }
}

// GET - Get current status
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const data = (agent.data as Record<string, unknown>) || {};
        const safety = (config.safety as Record<string, unknown>) || {};

        const automationReplied = (safety.automationReplied || []) as string[];
        const messageQueue = (data.messageQueue || []) as unknown[];

        return NextResponse.json({
            repliedChatsCount: automationReplied.length,
            repliedChats: automationReplied,
            queueLength: messageQueue.length,
        });
    } catch (error) {
        console.error("[Reset] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get status" },
            { status: 500 }
        );
    }
}
