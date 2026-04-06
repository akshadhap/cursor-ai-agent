/**
 * Automation Queue Worker - Cron Job
 * Processes queued messages one at a time with humanized timing
 * 
 * This should be called every minute by a cron scheduler (Vercel Cron, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
    getNextPendingMessage,
    getAllPendingMessages,
    markAsProcessing,
    markAsSent,
    markAsFailed,
    cleanOldMessages,
    type QueuedMessage,
    type QueueConfig,
    DEFAULT_QUEUE_CONFIG,
} from "@/lib/automation-queue";
import {
    canSendMessage,
    incrementMessageCount,
    initSafetyConfig,
    initAnalytics,
    updateDailyStats,
    markAsReplied,
    type SafetyConfig,
    type AnalyticsData,
} from "@/lib/linkedin-safety";

// POST - Process queue (called by cron)
export async function POST(req: NextRequest) {
    // Validate cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Queue Worker] Starting queue processing...");

    try {
        // Get all LinkedIn scheduler agents
        const agents = await prisma.standaloneAgent.findMany({
            where: { type: "LINKEDIN_SCHEDULER" },
        });

        console.log(`[Queue Worker] Found ${agents.length} agents`);

        let totalProcessed = 0;
        let totalErrors = 0;

        for (const agent of agents) {
            const config = (agent.config as Record<string, unknown>) || {};
            const queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...(config.queueConfig as Partial<QueueConfig>) };

            // Skip if queue is disabled
            if (!queueConfig.enabled) {
                console.log(`[Queue Worker] Queue disabled for agent ${agent.id}`);
                continue;
            }

            // SINGLE MESSAGE PROCESSING: Only process ONE message per cron run per agent
            // This ensures proper delays between messages (20-45 seconds)
            const nextMessage = await getNextPendingMessage(agent.id);

            if (!nextMessage) {
                console.log(`[Queue Worker] No pending messages for agent ${agent.id}`);
                continue;
            }

            // Check if it's time to send this message (respect scheduledFor)
            const scheduledTime = new Date(nextMessage.scheduledFor);
            const now = new Date();

            if (scheduledTime > now) {
                const waitSeconds = Math.round((scheduledTime.getTime() - now.getTime()) / 1000);
                console.log(`[Queue Worker] Message ${nextMessage.id} scheduled for ${waitSeconds}s from now, skipping this run`);
                continue;
            }

            console.log(`[Queue Worker] Processing single message ${nextMessage.id} (${nextMessage.type}) for agent ${agent.id}`);

            // Mark as processing
            await markAsProcessing(agent.id, nextMessage.id);

            try {
                const success = await processMessage(agent.id, config, nextMessage);

                if (success) {
                    await markAsSent(agent.id, nextMessage.id);
                    console.log(`[Queue Worker] Message ${nextMessage.id} sent successfully`);
                    totalProcessed++;
                } else {
                    await markAsFailed(agent.id, nextMessage.id, "Send failed");
                    totalErrors++;
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                await markAsFailed(agent.id, nextMessage.id, errorMsg);
                console.error(`[Queue Worker] Error processing message ${nextMessage.id}:`, error);
                totalErrors++;
            }

            // Clean old messages periodically (low overhead)
            if (Math.random() < 0.1) {
                const cleaned = await cleanOldMessages(agent.id);
                if (cleaned > 0) {
                    console.log(`[Queue Worker] Cleaned ${cleaned} old messages for agent ${agent.id}`);
                }
            }
        }

        console.log(`[Queue Worker] Completed. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors,
        });
    } catch (error) {
        console.error("[Queue Worker] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Queue processing failed" },
            { status: 500 }
        );
    }
}

/**
 * Process a single queued message
 */
async function processMessage(
    agentId: string,
    config: Record<string, unknown>,
    message: QueuedMessage
): Promise<boolean> {
    const unipileAccountId = config.unipileAccountId as string;

    if (!unipileAccountId) {
        console.error("[Queue Worker] No Unipile account ID");
        return false;
    }

    const safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);
    const canSend = canSendMessage(safetyConfig);

    if (!canSend.canSend) {
        console.log(`[Queue Worker] Safety limit: ${canSend.reason}`);
        return false;
    }

    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    const baseUrl = `https://${dsn}/api/v1`;
    const apiKey = process.env.UNIPILE_API_KEY || "";

    switch (message.type) {
        case 'dm_reply':
            return await sendDMReply(baseUrl, apiKey, unipileAccountId, message, agentId, config, safetyConfig);

        case 'comment_reply':
            return await sendCommentReply(baseUrl, apiKey, unipileAccountId, message, agentId, config, safetyConfig);

        case 'lead_magnet':
            return await sendLeadMagnet(baseUrl, apiKey, unipileAccountId, message, agentId, config, safetyConfig);

        default:
            console.error(`[Queue Worker] Unknown message type: ${message.type}`);
            return false;
    }
}

/**
 * Send a DM reply
 */
async function sendDMReply(
    baseUrl: string,
    apiKey: string,
    accountId: string,
    message: QueuedMessage,
    agentId: string,
    config: Record<string, unknown>,
    safetyConfig: SafetyConfig
): Promise<boolean> {
    const response = await fetch(`${baseUrl}/chats/${message.chatId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
            account_id: accountId,
            text: message.message,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[Queue Worker] DM reply failed:", errorText);
        return false;
    }

    // Update safety, analytics, and history
    await updateAgentAfterSend(agentId, config, safetyConfig, 'dm_reply', message.chatId, message.recipientName, message.message, message.ruleId, message.ruleName);

    return true;
}

/**
 * Send a comment reply (public)
 */
async function sendCommentReply(
    baseUrl: string,
    apiKey: string,
    accountId: string,
    message: QueuedMessage,
    agentId: string,
    config: Record<string, unknown>,
    safetyConfig: SafetyConfig
): Promise<boolean> {
    const response = await fetch(`${baseUrl}/posts/${message.postId}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
            account_id: accountId,
            text: message.message,
            reply_to_comment_id: message.commentId,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[Queue Worker] Comment reply failed:", errorText);
        return false;
    }

    // Update safety, analytics, and history
    await updateAgentAfterSend(agentId, config, safetyConfig, 'comment_reply', undefined, message.recipientName, message.message, message.ruleId, message.ruleName);

    return true;
}

/**
 * Send lead magnet (public reply + DM)
 */
async function sendLeadMagnet(
    baseUrl: string,
    apiKey: string,
    accountId: string,
    message: QueuedMessage,
    agentId: string,
    config: Record<string, unknown>,
    safetyConfig: SafetyConfig
): Promise<boolean> {
    // Step 1: Send public reply
    if (message.publicReply) {
        const publicResponse = await fetch(`${baseUrl}/posts/${message.postId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": apiKey,
            },
            body: JSON.stringify({
                account_id: accountId,
                text: message.publicReply,
                reply_to_comment_id: message.commentId,
            }),
        });

        if (!publicResponse.ok) {
            const errorText = await publicResponse.text();
            console.error("[Queue Worker] Public reply failed:", errorText);
            return false;
        }
    }

    // Step 2: Send DM with attachment
    const dmBody: Record<string, unknown> = {
        account_id: accountId,
        attendees_ids: [message.recipientId],
        text: message.message,
    };

    if (message.attachmentUrl) {
        dmBody.attachments = [{ url: message.attachmentUrl }];
    }

    const dmResponse = await fetch(`${baseUrl}/chats`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
        },
        body: JSON.stringify(dmBody),
    });

    if (!dmResponse.ok) {
        const errorText = await dmResponse.text();
        console.error("[Queue Worker] DM failed:", errorText);
        return false;
    }

    // Update safety, analytics, and history
    await updateAgentAfterSend(agentId, config, safetyConfig, 'lead_magnet', undefined, message.recipientName, message.message, message.ruleId, message.ruleName);

    return true;
}

/**
 * Update agent config/data after sending
 */
async function updateAgentAfterSend(
    agentId: string,
    config: Record<string, unknown>,
    safetyConfig: SafetyConfig,
    type: 'dm_reply' | 'comment_reply' | 'lead_magnet',
    chatId?: string,
    recipientName?: string,
    messageContent?: string,
    ruleId?: string,
    ruleName?: string
): Promise<void> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return;

    const agentData = (agent.data as Record<string, unknown>) || {};
    let analytics = (agentData.analytics || initAnalytics()) as AnalyticsData;
    let updatedSafety = incrementMessageCount(safetyConfig);

    // Update analytics based on type
    if (type === 'dm_reply') {
        analytics = updateDailyStats(analytics, 'messagesSent', 1);
        if (chatId) {
            updatedSafety = markAsReplied(chatId, updatedSafety);
        }
    } else if (type === 'comment_reply') {
        analytics = updateDailyStats(analytics, 'repliesReceived', 1);
    } else if (type === 'lead_magnet') {
        analytics = updateDailyStats(analytics, 'leadMagnets', 1);
    }

    // Add to automation history for History tab
    const automationHistory = Array.isArray(agentData.automationHistory)
        ? agentData.automationHistory as Array<Record<string, unknown>>
        : [];

    automationHistory.unshift({
        id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        ruleName: ruleName || (type === 'dm_reply' ? 'Auto-Reply' : type === 'comment_reply' ? 'Comment Reply' : 'Lead Magnet'),
        ruleId: ruleId || null,  // Automation pointer - link to source rule
        triggerKeyword: 'automation',
        recipientName: recipientName || 'Unknown',
        message: messageContent ? messageContent.substring(0, 100) : '',
        timestamp: new Date().toISOString(),
    });

    // Keep only last 100 entries
    const trimmedHistory = automationHistory.slice(0, 100);

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            config: JSON.parse(JSON.stringify({
                ...config,
                safety: updatedSafety,
            })),
            data: JSON.parse(JSON.stringify({
                ...agentData,
                analytics,
                automationHistory: trimmedHistory,
            })),
        },
    });
}

// GET - Check queue status
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "automation-queue-worker",
        timestamp: new Date().toISOString(),
    });
}
