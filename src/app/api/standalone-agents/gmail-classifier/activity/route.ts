import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { createActivityLog, ActivityLog, ActivityType, ActivityStatus } from "@/lib/activity-history";

const MAX_ACTIVITY_LOGS = 100; // Keep last 100 logs

/**
 * GET /api/standalone-agents/gmail-classifier/activity
 * Fetch activity logs for an agent
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const type = searchParams.get("type"); // Optional filter by type
        const limit = parseInt(searchParams.get("limit") || "50");

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as any;
        let activityLogs: ActivityLog[] = config?.activityLogs || [];

        // Filter by type if specified
        if (type) {
            activityLogs = activityLogs.filter(log => log.type === type);
        }

        // Sort by timestamp descending (newest first)
        activityLogs.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Limit results
        activityLogs = activityLogs.slice(0, limit);

        return NextResponse.json({
            success: true,
            logs: activityLogs,
            total: activityLogs.length,
        });

    } catch (error) {
        console.error("[Activity] GET Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/standalone-agents/gmail-classifier/activity
 * Add a new activity log entry
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, type, action, details, status = 'success', metadata } = body;

        if (!agentId || !type || !action) {
            return NextResponse.json(
                { error: "agentId, type, and action are required" },
                { status: 400 }
            );
        }

        // Create new log entry
        const newLog = createActivityLog(
            type as ActivityType,
            action,
            details || '',
            status as ActivityStatus,
            metadata
        );

        // Get current agent config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as any;
        let activityLogs: ActivityLog[] = config?.activityLogs || [];

        // Add new log at the beginning
        activityLogs.unshift(newLog);

        // Keep only the last MAX_ACTIVITY_LOGS entries
        if (activityLogs.length > MAX_ACTIVITY_LOGS) {
            activityLogs = activityLogs.slice(0, MAX_ACTIVITY_LOGS);
        }

        // Update agent config with new logs
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    activityLogs,
                },
            },
        });

        return NextResponse.json({
            success: true,
            log: newLog,
        });

    } catch (error) {
        console.error("[Activity] POST Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
