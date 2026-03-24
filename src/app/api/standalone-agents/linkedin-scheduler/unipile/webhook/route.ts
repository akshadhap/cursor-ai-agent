import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Unipile Webhook Handler
 * Receives and processes events from Unipile (comments, messages, etc.)
 * 
 * QUEUE-BASED: Messages are added to queue instead of sent immediately
 * The queue worker cron job processes them with humanized delays
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { addToQueue } from "@/lib/automation-queue";
import {
    isSelfMessage,
    hasAlreadyReplied,
    initSafetyConfig,
    type SafetyConfig,
} from "@/lib/linkedin-safety";

interface UnipileWebhookEvent {
    event: string;
    account_id: string;
    data: Record<string, unknown>;
    timestamp: string;
}

// POST - Receive webhook events from Unipile
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as UnipileWebhookEvent;
        const { event, account_id, data } = body;

        logger.info(`[Webhook] Received event: ${event} for account: ${account_id}`);

        // Find agent by Unipile account ID
        const agents = await prisma.standaloneAgent.findMany({
            where: {
                type: "LINKEDIN_SCHEDULER",
            },
        });

        // Find the agent with this account ID
        let agent = null;
        for (const a of agents) {
            const config = (a.config as Record<string, unknown>) || {};
            if (config.unipileAccountId === account_id) {
                agent = a;
                break;
            }
        }

        if (!agent) {
            logger.info(`[Webhook] No agent found for account: ${account_id}`);
            return NextResponse.json({ success: true, message: "No agent found" });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const agentData = (agent.data as Record<string, unknown>) || {};

        // Route to appropriate handler based on event type
        // Note: Unipile may send events with underscores (message_received) or dots (message.received)
        switch (event) {
            case "post.comment_received":
            case "post_comment_received":
                await handleCommentReceived(agent.id, config, agentData, data, account_id);
                break;

            case "message.received":
            case "message_received":
                await handleMessageReceived(agent.id, config, agentData, data, account_id);
                break;

            default:
                logger.info(`[Webhook] Unhandled event type: ${event}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Webhook processing failed" },
            { status: 500 }
        );
    }
}

// Handle post.comment_received - Check for lead magnet keywords
// QUEUE-BASED: Adds to queue instead of sending immediately
async function handleCommentReceived(
    agentId: string,
    config: Record<string, unknown>,
    agentData: Record<string, unknown>,
    data: Record<string, unknown>,
    accountId: string
) {
    const comment = data as {
        post_id?: string;
        comment_id?: string;
        author_id?: string;
        author_name?: string;
        text?: string;
    };

    if (!comment.text || !comment.post_id) {
        logger.info("[Webhook] Comment missing text or post_id");
        return;
    }

    // Don't process our own comments
    if (isSelfMessage(comment.author_id || "", accountId)) {
        logger.info("[Webhook] Ignoring self comment");
        return;
    }

    const commentText = comment.text.toLowerCase();
    const leadMagnets = (config.leadMagnets || []) as Array<{
        id: string;
        keyword: string;
        publicReply: string;
        dmMessage: string;
        attachmentUrl?: string;
        enabled: boolean;
        triggeredCount: number;
    }>;

    // Find matching lead magnet
    const matchingMagnet = leadMagnets.find(
        (lm) => lm.enabled && commentText.includes(lm.keyword.toLowerCase())
    );

    if (!matchingMagnet) {
        logger.info("[Webhook] No matching lead magnet keyword found");
        return;
    }

    logger.info(`[Webhook] Matched lead magnet: ${matchingMagnet.keyword}`);

    // Personalize the messages
    const firstName = comment.author_name?.split(" ")[0] || "there";
    const personalizedReply = matchingMagnet.publicReply.replace(/\{\{firstName\}\}/g, firstName);
    const personalizedDm = matchingMagnet.dmMessage.replace(/\{\{firstName\}\}/g, firstName);

    // Add to queue instead of sending immediately
    try {
        await addToQueue(agentId, {
            type: 'lead_magnet',
            postId: comment.post_id,
            commentId: comment.comment_id,
            recipientId: comment.author_id || "",
            recipientName: comment.author_name || "User",
            message: personalizedDm,
            publicReply: personalizedReply,
            attachmentUrl: matchingMagnet.attachmentUrl,
        });

        logger.info("[Webhook] Lead magnet added to queue for humanized sending");
    } catch (error) {
        console.error("[Webhook] Failed to add lead magnet to queue:", error);
    }

    // Update lead magnet triggered count (queued count)
    const updatedLeadMagnets = leadMagnets.map((lm) =>
        lm.id === matchingMagnet.id ? { ...lm, triggeredCount: lm.triggeredCount + 1 } : lm
    );

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            config: JSON.parse(JSON.stringify({
                ...config,
                leadMagnets: updatedLeadMagnets,
            })),
        },
    });

    logger.info("[Webhook] Lead magnet queued successfully!");
}

// Handle message.received - Check for smart reply rules
// QUEUE-BASED: Adds to queue instead of sending immediately
async function handleMessageReceived(
    agentId: string,
    config: Record<string, unknown>,
    agentData: Record<string, unknown>,
    data: Record<string, unknown>,
    accountId: string
) {
    // Early return if data is empty or malformed
    if (!data || typeof data !== 'object') {
        logger.info("[Webhook] Message data is empty or malformed");
        return;
    }

    const message = data as {
        chat_id?: string;
        message_id?: string;
        sender_id?: string;
        sender_name?: string;
        text?: string;
    };

    if (!message.text || !message.chat_id) {
        logger.info("[Webhook] Message missing text or chat_id");
        return;
    }

    // Don't process our own messages (infinite loop protection)
    if (isSelfMessage(message.sender_id || "", accountId)) {
        logger.info("[Webhook] Ignoring self message");
        return;
    }

    // Check if already replied to this chat
    const safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);
    if (hasAlreadyReplied(message.chat_id, safetyConfig)) {
        logger.info("[Webhook] Already replied to this chat");
        return;
    }

    const messageText = message.text.toLowerCase();
    const smartRules = (config.smartRules || []) as Array<{
        id: string;
        name: string;
        keywords: string[];
        response: string;
        enabled: boolean;
        notifyOnReply: boolean;
        triggeredCount?: number;
    }>;

    // Find matching rule
    const matchingRule = smartRules.find(
        (rule) =>
            rule.enabled &&
            rule.keywords.some((keyword) => messageText.includes(keyword.toLowerCase()))
    );

    if (!matchingRule) {
        logger.info("[Webhook] No matching smart rule found");
        return;
    }

    logger.info(`[Webhook] Matched smart rule: ${matchingRule.name}`);

    // Personalize the response
    const firstName = message.sender_name?.split(" ")[0] || "there";
    const personalizedResponse = matchingRule.response.replace(/\{\{firstName\}\}/g, firstName);

    // Add to queue instead of sending immediately
    try {
        await addToQueue(agentId, {
            type: 'dm_reply',
            chatId: message.chat_id,
            recipientId: message.sender_id || "",
            recipientName: message.sender_name || "User",
            message: personalizedResponse,
        });

        logger.info("[Webhook] DM reply added to queue for humanized sending");
    } catch (error) {
        console.error("[Webhook] Failed to add DM reply to queue:", error);
        return;
    }

    // Update smart rule triggered count + mark chat as replied (to prevent duplicates)
    const updatedSmartRules = smartRules.map((rule) =>
        rule.id === matchingRule.id
            ? { ...rule, triggeredCount: (rule.triggeredCount || 0) + 1 }
            : rule
    );

    // Mark as replied in safety config (prevents duplicate replies)
    const automationReplied = [...(safetyConfig.automationReplied || []), message.chat_id];
    const updatedSafety = { ...safetyConfig, automationReplied };

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            config: JSON.parse(JSON.stringify({
                ...config,
                smartRules: updatedSmartRules,
                safety: updatedSafety,
            })),
        },
    });

    logger.info("[Webhook] DM reply queued successfully!");
}
