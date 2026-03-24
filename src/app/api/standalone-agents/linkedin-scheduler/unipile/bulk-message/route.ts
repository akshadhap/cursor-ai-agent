import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Bulk Message API (Batch Awakener)
 * Send personalized messages to connections in batches with human-like delays
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import {
    canSendMessage,
    incrementMessageCount,
    getRandomDelay,
    initSafetyConfig,
    initAnalytics,
    updateDailyStats,
    type SafetyConfig,
    type AnalyticsData,
    DAILY_MESSAGE_LIMIT,
} from "@/lib/linkedin-safety";

interface BulkCampaign {
    id: string;
    name: string;
    message: string;           // Message template with {{firstName}} placeholder
    status: "draft" | "running" | "paused" | "completed" | "failed";
    targetCount: number;       // Number of connections to message
    sentCount: number;
    repliedCount: number;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

interface Connection {
    id: string;
    name: string;
    status: "pending" | "messaged" | "replied" | "skipped";
    campaignId?: string;
}

// GET - Get bulk campaigns and their status
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
        const campaigns = (config.bulkCampaigns || []) as BulkCampaign[];
        const safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);

        // Get today's remaining message count
        const today = new Date().toISOString().split('T')[0];
        const isNewDay = safetyConfig.lastMessageDate !== today;
        const messagesRemaining = isNewDay ? DAILY_MESSAGE_LIMIT : (DAILY_MESSAGE_LIMIT - safetyConfig.dailyMessageCount);

        return NextResponse.json({
            success: true,
            campaigns,
            messagesRemaining,
            dailyLimit: DAILY_MESSAGE_LIMIT,
            automationPaused: safetyConfig.automationPaused,
        });
    } catch (error) {
        console.error("[Bulk Message] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get campaigns" },
            { status: 500 }
        );
    }
}

// POST - Create campaign or send batch messages
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
        const { agentId, action, campaign, campaignId, batchSize = 10 } = body;

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
        const agentData = (agent.data as Record<string, unknown>) || {};

        if (action === "create") {
            // Create a new campaign
            if (!campaign?.name || !campaign?.message || !campaign?.targetCount) {
                return NextResponse.json({ error: "Missing campaign details" }, { status: 400 });
            }

            const newCampaign: BulkCampaign = {
                id: `bc_${Date.now()}`,
                name: campaign.name,
                message: campaign.message,
                status: "draft",
                targetCount: Math.min(campaign.targetCount, 100), // Max 100 per campaign per day
                sentCount: 0,
                repliedCount: 0,
                createdAt: new Date().toISOString(),
            };

            const campaigns = (config.bulkCampaigns || []) as BulkCampaign[];
            const updatedCampaigns = [...campaigns, newCampaign];

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({
                        ...config,
                        bulkCampaigns: updatedCampaigns,
                    })),
                },
            });

            return NextResponse.json({
                success: true,
                message: "Campaign created",
                campaign: newCampaign,
            });
        }

        if (action === "send_batch") {
            // Send a batch of messages
            if (!campaignId) {
                return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
            }

            const safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);
            const canSend = canSendMessage(safetyConfig);

            if (!canSend.canSend) {
                return NextResponse.json({
                    error: canSend.reason,
                    messagesRemaining: 0,
                }, { status: 429 });
            }

            const campaigns = (config.bulkCampaigns || []) as BulkCampaign[];
            const campaign = campaigns.find(c => c.id === campaignId);

            if (!campaign) {
                return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
            }

            const connections = (config.connections || []) as Connection[];
            const accountId = config.unipileAccountId as string;

            if (!accountId) {
                return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
            }

            // Find pending connections for this campaign
            const pendingConnections = connections.filter(
                c => c.status === "pending" && !c.campaignId
            ).slice(0, Math.min(batchSize, canSend.remainingToday));

            if (pendingConnections.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: "No pending connections to message",
                    sent: 0,
                });
            }

            const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
            const baseUrl = `https://${dsn}/api/v1`;

            let sentCount = 0;
            let updatedSafety = safetyConfig;
            let analytics = (agentData.analytics || initAnalytics()) as AnalyticsData;
            const results: { connectionId: string; success: boolean; error?: string }[] = [];

            // Send messages with delays
            for (const connection of pendingConnections) {
                // Check if we can still send
                const check = canSendMessage(updatedSafety);
                if (!check.canSend) {
                    logger.info(`[Bulk Message] Stopping: ${check.reason}`);
                    break;
                }

                try {
                    // Personalize the message
                    const firstName = connection.name.split(" ")[0] || "there";
                    const personalizedMessage = campaign.message.replace(/\{\{firstName\}\}/g, firstName);

                    // Send via Unipile
                    const response = await fetch(`${baseUrl}/chats`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                        },
                        body: JSON.stringify({
                            account_id: accountId,
                            attendees_ids: [connection.id],
                            text: personalizedMessage,
                        }),
                    });

                    if (response.ok) {
                        sentCount++;
                        updatedSafety = incrementMessageCount(updatedSafety);
                        analytics = updateDailyStats(analytics, "messagesSent", 1);
                        results.push({ connectionId: connection.id, success: true });
                    } else {
                        const errorText = await response.text();
                        results.push({ connectionId: connection.id, success: false, error: errorText });

                        // Check for rate limits
                        if (response.status === 429 || response.status === 403) {
                            updatedSafety = {
                                ...updatedSafety,
                                automationPaused: true,
                                pauseReason: `Rate limit or restriction: ${response.status}`,
                            };
                            break;
                        }
                    }
                } catch (error) {
                    results.push({
                        connectionId: connection.id,
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }

                // Add random delay between messages (60-180 seconds)
                if (sentCount < pendingConnections.length) {
                    const delaySeconds = getRandomDelay();
                    logger.info(`[Bulk Message] Waiting ${delaySeconds}s before next message...`);
                    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                }
            }

            // Update connections status
            const updatedConnections = connections.map(c => {
                const result = results.find(r => r.connectionId === c.id);
                if (result?.success) {
                    return {
                        ...c,
                        status: "messaged" as const,
                        campaignId: campaign.id,
                    };
                }
                return c;
            });

            // Update campaign
            const updatedCampaigns = campaigns.map(c =>
                c.id === campaignId
                    ? {
                        ...c,
                        sentCount: c.sentCount + sentCount,
                        status: (c.sentCount + sentCount >= c.targetCount ? "completed" : "running") as BulkCampaign["status"],
                        startedAt: c.startedAt || new Date().toISOString(),
                        completedAt: c.sentCount + sentCount >= c.targetCount ? new Date().toISOString() : undefined,
                    }
                    : c
            );

            // Save everything
            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({
                        ...config,
                        connections: updatedConnections,
                        bulkCampaigns: updatedCampaigns,
                        safety: updatedSafety,
                    })),
                    data: JSON.parse(JSON.stringify({
                        ...agentData,
                        analytics,
                    })),
                },
            });

            return NextResponse.json({
                success: true,
                sent: sentCount,
                results,
                messagesRemaining: canSend.remainingToday - sentCount,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("[Bulk Message] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a campaign
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
        const { agentId, campaignId } = body;

        if (!agentId || !campaignId) {
            return NextResponse.json({ error: "Missing agentId or campaignId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const campaigns = (config.bulkCampaigns || []) as BulkCampaign[];

        const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify({
                    ...config,
                    bulkCampaigns: updatedCampaigns,
                })),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Campaign deleted",
        });
    } catch (error) {
        console.error("[Bulk Message] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete campaign" },
            { status: 500 }
        );
    }
}
