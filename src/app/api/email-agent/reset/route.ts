import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

/**
 * POST /api/email-agent/reset
 * Reset specific parts of agent config (keeps Gmail connection)
 * 
 * Body options:
 * - resetKnowledgeBase: boolean - Clear knowledge base entries
 * - resetEmails: boolean - Clear cached emails and stats
 * - resetRules: boolean - Clear automation rules
 * - resetActivityLogs: boolean - Clear activity history
 * - resetAll: boolean - Reset everything except Gmail connection
 */
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

        const body = await req.json().catch(() => ({}));
        const { resetKnowledgeBase, resetEmails, resetRules, resetActivityLogs, resetAll } = body;

        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
        });

        if (!agent) {
            return NextResponse.json({ error: "No agent found" }, { status: 404 });
        }

        const currentConfig = (agent.config as any) || {};
        const currentData = (agent.data as any) || {};

        // Preserve critical auth fields
        const preservedFields = {
            accessToken: currentConfig.accessToken,
            refreshToken: currentConfig.refreshToken,
            tokenExpiresAt: currentConfig.tokenExpiresAt,
            gmailEmail: currentConfig.gmailEmail,
            jira: currentConfig.jira,
            notion: currentConfig.notion,
            slack: currentConfig.slack,
            syncPreferences: currentConfig.syncPreferences,
        };

        let newConfig = { ...currentConfig };
        let newData = { ...currentData };
        const resetFields: string[] = [];

        if (resetAll) {
            newConfig = {
                ...preservedFields,
                knowledgeBase: [],
                automationRules: [],
                activityLogs: [],
                automationProcessedIds: [],
            };
            newData = { emails: [], stats: {} };
            resetFields.push("knowledgeBase", "automationRules", "activityLogs", "emails", "stats");
        } else {
            if (resetKnowledgeBase) {
                newConfig.knowledgeBase = [];
                resetFields.push("knowledgeBase");
            }
            if (resetRules) {
                newConfig.automationRules = [];
                resetFields.push("automationRules");
            }
            if (resetActivityLogs) {
                newConfig.activityLogs = [];
                newConfig.automationProcessedIds = [];
                resetFields.push("activityLogs");
            }
            if (resetEmails) {
                newData.emails = [];
                newData.stats = {};
                resetFields.push("emails", "stats");
            }
        }

        if (resetFields.length === 0) {
            return NextResponse.json({
                error: "No reset option specified. Use resetKnowledgeBase, resetEmails, resetRules, resetActivityLogs, or resetAll"
            }, { status: 400 });
        }

        await prisma.standaloneAgent.update({
            where: { id: agent.id },
            data: {
                config: newConfig,
                data: newData,
            },
        });

        console.log(`[Reset] Reset agent ${agent.id} - Fields: ${resetFields.join(", ")}`);

        return NextResponse.json({
            success: true,
            message: `Reset successful: ${resetFields.join(", ")}`,
            resetFields,
        });

    } catch (error: any) {
        console.error("[Reset] Error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to reset agent" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/email-agent/reset
 * Completely delete the agent (user will need to reconnect Gmail)
 */
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

        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
        });

        if (!agent) {
            return NextResponse.json({
                success: true,
                message: "No agent found to delete"
            });
        }

        await prisma.standaloneAgent.delete({
            where: { id: agent.id },
        });

        console.log(`[Reset] Deleted agent ${agent.id} for user ${user.id}`);

        return NextResponse.json({
            success: true,
            message: "Agent deleted. Refresh the page to create a new one.",
            deletedAgentId: agent.id,
        });

    } catch (error: any) {
        console.error("[Reset] Delete error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to delete agent" },
            { status: 500 }
        );
    }
}
