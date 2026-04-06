/**
 * LinkedIn Scheduler - Analytics API Route
 * Get campaign performance metrics and activity stats
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import {
    type AnalyticsData,
    type SafetyConfig,
    initAnalytics,
    getConversionRate,
    DAILY_MESSAGE_LIMIT,
} from "@/lib/linkedin-safety";

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

        const config = (agent.config as Record<string, unknown>) || {};
        const data = (agent.data as Record<string, unknown>) || {};

        // Get automation data from correct config keys
        const smartRules = Array.isArray(config.smartRules) ? config.smartRules : [];
        const postAutomations = Array.isArray(config.postAutomations) ? config.postAutomations : [];
        const leadMagnets = Array.isArray(config.leadMagnets) ? config.leadMagnets : [];
        const posts = Array.isArray(data.posts) ? data.posts : [];

        // Calculate metrics from all automation sources
        let totalDMReplies = 0;
        let totalCommentReplies = 0;
        let totalLeadMagnets = 0;

        // Smart Rules -> DM replies
        for (const rule of smartRules) {
            const triggeredCount = (rule as { triggeredCount?: number }).triggeredCount || 0;
            totalDMReplies += triggeredCount;
        }

        // Post Automations -> Comment replies (check if has DM for lead capture)
        for (const auto of postAutomations) {
            const triggeredCount = (auto as { triggeredCount?: number; dmMessage?: string }).triggeredCount || 0;
            const hasDM = (auto as { dmMessage?: string }).dmMessage;
            if (hasDM) {
                totalLeadMagnets += triggeredCount;
            } else {
                totalCommentReplies += triggeredCount;
            }
        }

        // Lead Magnets
        for (const magnet of leadMagnets) {
            const triggeredCount = (magnet as { triggeredCount?: number }).triggeredCount || 0;
            totalLeadMagnets += triggeredCount;
        }

        const totalMessagesSent = totalDMReplies + totalCommentReplies + totalLeadMagnets;
        const totalRepliesReceived = totalCommentReplies; // Comment replies are in response to user comments

        // Calculate from posts
        const postedCount = posts.filter((p: { status?: string }) => p.status === 'posted').length;

        // Get safety config
        const safetyConfig = (config.safety || {}) as Partial<SafetyConfig>;

        // Calculate conversion rate (lead magnets / total engagement * 100)
        const conversionRate = totalMessagesSent > 0
            ? Math.round((totalLeadMagnets / totalMessagesSent) * 100)
            : 0;

        // Get today's date for daily stats
        const today = new Date().toISOString().split('T')[0];

        // Calculate daily limit usage
        const messagesRemaining = DAILY_MESSAGE_LIMIT - (safetyConfig.dailyMessageCount || 0);
        const isNewDay = safetyConfig.lastMessageDate !== today;
        const actualRemaining = isNewDay ? DAILY_MESSAGE_LIMIT : messagesRemaining;

        return NextResponse.json({
            success: true,
            analytics: {
                // Overview metrics (calculated from real data)
                overview: {
                    totalMessagesSent: totalMessagesSent,
                    totalRepliesReceived: totalRepliesReceived,
                    conversionRate: conversionRate,
                    leadMagnetsSent: totalLeadMagnets,
                },

                // Today's activity (from safety daily count)
                today: {
                    messagesSent: isNewDay ? 0 : (safetyConfig.dailyMessageCount || 0),
                    repliesReceived: 0, // Would need real-time tracking
                    leadMagnets: 0, // Would need daily tracking
                    messagesRemaining: actualRemaining,
                    dailyLimit: DAILY_MESSAGE_LIMIT,
                },

                // Automation breakdown
                automationBreakdown: {
                    dmReplies: totalDMReplies,
                    commentReplies: totalCommentReplies,
                    leadMagnets: totalLeadMagnets,
                },

                // Post stats
                posts: {
                    total: posts.length,
                    posted: postedCount,
                },

                // Safety status
                safety: {
                    automationPaused: safetyConfig.automationPaused || false,
                    pauseReason: safetyConfig.pauseReason,
                    dailyMessageCount: isNewDay ? 0 : (safetyConfig.dailyMessageCount || 0),
                },
            },
        });
    } catch (error) {
        console.error("[Analytics] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get analytics" },
            { status: 500 }
        );
    }
}

// POST - Reset analytics or resume automation
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
        const { agentId, action } = body;

        if (!agentId || !action) {
            return NextResponse.json({ error: "Missing agentId or action" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const data = (agent.data as Record<string, unknown>) || {};

        if (action === "resume_automation") {
            // Resume paused automation
            const updatedConfig = {
                ...config,
                safety: {
                    ...(config.safety as object || {}),
                    automationPaused: false,
                    pauseReason: undefined,
                },
            };

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify(updatedConfig)),
                },
            });

            return NextResponse.json({ success: true, message: "Automation resumed" });
        }

        if (action === "reset_analytics") {
            // Reset all analytics data
            const updatedData = {
                ...data,
                analytics: initAnalytics(),
            };

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    data: JSON.parse(JSON.stringify(updatedData)),
                },
            });

            return NextResponse.json({ success: true, message: "Analytics reset" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("[Analytics] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Action failed" },
            { status: 500 }
        );
    }
}
