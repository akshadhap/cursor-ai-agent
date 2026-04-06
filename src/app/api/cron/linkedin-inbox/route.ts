/**
 * LinkedIn Scheduler - Cron Job for Inbox Monitoring
 * Fetches new messages from LinkedIn and queues auto-replies
 * Runs every 1-2 minutes - more reliable than webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { addToQueue } from "@/lib/automation-queue";
import {
    hasAlreadyReplied,
    markAsReplied,
    initSafetyConfig,
    type SafetyConfig,
} from "@/lib/linkedin-safety";

interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: "new_today" | "all_unread" | "keyword";
    keyword?: string;
    replyMessage: string;
    delay: number;
    createdAt?: string;
    triggeredCount?: number;
}

interface ChatMessage {
    id: string;
    chat_id: string;
    sender_id: string;
    sender_name?: string;
    text: string;
    timestamp: string;
    is_sender: boolean;
}

interface Chat {
    id: string;
    name: string;
    unread_count: number;
    timestamp: string;
    attendee_provider_id: string;
}

// POST - Run cron job for inbox monitoring
export async function POST(req: NextRequest) {
    // Validate cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Inbox Cron] Starting inbox monitoring...");

    try {
        // Get all LinkedIn scheduler agents
        const agents = await prisma.standaloneAgent.findMany({
            where: { type: "LINKEDIN_SCHEDULER" },
        });

        console.log(`[Inbox Cron] Found ${agents.length} agents`);

        let totalProcessed = 0;
        let totalQueued = 0;

        for (const agent of agents) {
            const config = (agent.config as Record<string, unknown>) || {};
            const unipileAccountId = config.unipileAccountId as string;

            if (!unipileAccountId) {
                console.log(`[Inbox Cron] Agent ${agent.id} has no Unipile account`);
                continue;
            }

            // Check both automationRules (from MessagesPanel) and smartRules (legacy)
            const automationRules = (config.automationRules || []) as AutomationRule[];
            const enabledRules = automationRules.filter(r => r.enabled);

            if (enabledRules.length === 0) {
                console.log(`[Inbox Cron] Agent ${agent.id} has no enabled rules`);
                continue;
            }

            const safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);

            // Fetch unread chats
            const result = await processAgentInbox(
                agent.id,
                config,
                unipileAccountId,
                enabledRules,
                safetyConfig
            );

            totalProcessed += result.chatsChecked;
            totalQueued += result.queued;
        }

        console.log(`[Inbox Cron] Complete. Chats: ${totalProcessed}, Queued: ${totalQueued}`);

        return NextResponse.json({
            success: true,
            agents: agents.length,
            chatsChecked: totalProcessed,
            queued: totalQueued,
        });
    } catch (error) {
        console.error("[Inbox Cron] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Cron job failed" },
            { status: 500 }
        );
    }
}

/**
 * Process inbox for a single agent
 */
async function processAgentInbox(
    agentId: string,
    config: Record<string, unknown>,
    accountId: string,
    automationRules: AutomationRule[],
    safetyConfig: SafetyConfig
): Promise<{ chatsChecked: number; queued: number }> {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    const baseUrl = `https://${dsn}/api/v1`;
    const apiKey = process.env.UNIPILE_API_KEY || "";

    let chatsChecked = 0;
    let queued = 0;

    try {
        // Fetch chats with unread messages
        const chatsResponse = await fetch(
            `${baseUrl}/chats?account_id=${accountId}&limit=20`,
            {
                headers: {
                    "X-API-KEY": apiKey,
                    "Accept": "application/json",
                },
            }
        );

        if (!chatsResponse.ok) {
            console.error("[Inbox Cron] Failed to fetch chats:", await chatsResponse.text());
            return { chatsChecked: 0, queued: 0 };
        }

        const chatsData = await chatsResponse.json();
        const chats = (chatsData.items || []) as Chat[];

        // Filter to chats with unread messages
        const unreadChats = chats.filter(chat => chat.unread_count > 0);
        console.log(`[Inbox Cron] Found ${unreadChats.length} chats with unread messages`);

        for (const chat of unreadChats) {
            chatsChecked++;

            // Note: We no longer skip here based on chat ID alone
            // We'll check per-rule after we know which rule matches

            // Fetch latest messages from this chat
            const messagesResponse = await fetch(
                `${baseUrl}/chats/${chat.id}/messages?limit=5`,
                {
                    headers: {
                        "X-API-KEY": apiKey,
                        "Accept": "application/json",
                    },
                }
            );

            if (!messagesResponse.ok) {
                console.error(`[Inbox Cron] Failed to fetch messages for chat ${chat.id}`);
                continue;
            }

            const messagesData = await messagesResponse.json();
            const messages = (messagesData.items || []) as ChatMessage[];

            // Get the latest message that's not from us
            const latestIncoming = messages.find(m => !m.is_sender);

            if (!latestIncoming || !latestIncoming.text) {
                continue;
            }

            // DEBUG: Log available fields in the message
            console.log(`[Inbox Cron] Message fields:`, JSON.stringify(latestIncoming, null, 2));

            const messageText = latestIncoming.text.toLowerCase();
            const messageTimestamp = new Date(latestIncoming.timestamp);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Skip messages that arrived before the last reset time
            // This prevents old unread messages from being processed after a reset
            const lastResetTime = safetyConfig.lastResetTime ? new Date(safetyConfig.lastResetTime) : null;
            if (lastResetTime && messageTimestamp < lastResetTime) {
                console.log(`[Inbox Cron] Skipping old message from ${messageTimestamp.toISOString()} (reset at ${lastResetTime.toISOString()})`);
                continue;
            }

            // Find matching rule based on trigger type
            // Priority: keyword rules first (most specific), then new_today, then all_unread
            // This ensures keyword-specific rules take precedence over catch-all rules
            const keywordRules = automationRules.filter(r => r.enabled && r.trigger === "keyword");
            const newTodayRules = automationRules.filter(r => r.enabled && r.trigger === "new_today");
            const allUnreadRules = automationRules.filter(r => r.enabled && r.trigger === "all_unread");

            // Check rules in priority order: keyword -> new_today -> all_unread
            const orderedRules = [...keywordRules, ...newTodayRules, ...allUnreadRules];

            const matchingRule = orderedRules.find(rule => {
                switch (rule.trigger) {
                    case "keyword":
                        // Match if message contains the keyword
                        return rule.keyword && messageText.includes(rule.keyword.toLowerCase());
                    case "new_today":
                        // Match if message is from today
                        return messageTimestamp >= todayStart;
                    case "all_unread":
                        // Match all unread messages
                        return true;
                    default:
                        return false;
                }
            });

            if (!matchingRule) {
                console.log(`[Inbox Cron] No matching rule for chat ${chat.id}`);
                continue;
            }

            // Check if we've already replied to this chat with THIS specific rule
            if (hasAlreadyReplied(chat.id, safetyConfig, matchingRule.id)) {
                console.log(`[Inbox Cron] Already replied to chat ${chat.id} with rule "${matchingRule.name}", skipping`);
                continue;
            }

            console.log(`[Inbox Cron] Matched rule "${matchingRule.name}" (${matchingRule.trigger}) for chat ${chat.id}`);

            // Fetch attendee name from Unipile since messages don't include sender_name
            let senderName = "there"; // fallback
            const senderId = (latestIncoming as any).sender_attendee_id;

            if (senderId) {
                try {
                    const attendeeResponse = await fetch(
                        `${baseUrl}/chat_attendees/${senderId}`,
                        {
                            headers: {
                                "X-API-KEY": apiKey,
                                "Accept": "application/json",
                            },
                        }
                    );

                    if (attendeeResponse.ok) {
                        const attendeeData = await attendeeResponse.json();
                        // Try different possible name fields
                        senderName = attendeeData.display_name ||
                            attendeeData.name ||
                            attendeeData.first_name ||
                            (attendeeData.first_name && attendeeData.last_name
                                ? `${attendeeData.first_name} ${attendeeData.last_name}`
                                : null) ||
                            "there";
                        console.log(`[Inbox Cron] Fetched attendee info:`, JSON.stringify(attendeeData, null, 2));
                    } else {
                        console.log(`[Inbox Cron] Failed to fetch attendee ${senderId}: ${attendeeResponse.status}`);
                    }
                } catch (error) {
                    console.log(`[Inbox Cron] Error fetching attendee: ${error}`);
                }
            }

            const firstName = senderName.split(" ")[0];
            console.log(`[Inbox Cron] Personalizing with name: "${senderName}" -> firstName: "${firstName}"`);
            const personalizedResponse = matchingRule.replyMessage.replace(
                /\{\{firstName\}\}/g,
                firstName
            );

            // IMPORTANT: Mark as replied FIRST to prevent duplicates if cron runs overlap
            // This prevents race conditions where two cron runs process the same chat
            await updateAgentAfterQueue(agentId, config, matchingRule.id, chat.id, safetyConfig);

            // Add to queue (queue also has its own deduplication check)
            try {
                await addToQueue(agentId, {
                    type: 'dm_reply',
                    chatId: chat.id,
                    recipientId: chat.attendee_provider_id || "",
                    recipientName: senderName,
                    message: personalizedResponse,
                    ruleId: matchingRule.id,
                    ruleName: matchingRule.name,
                });

                queued++;
                console.log(`[Inbox Cron] Queued reply for chat ${chat.id}`);

            } catch (error) {
                console.error(`[Inbox Cron] Failed to queue reply for chat ${chat.id}:`, error);
            }
        }

    } catch (error) {
        console.error("[Inbox Cron] Error processing inbox:", error);
    }

    return { chatsChecked, queued };
}

/**
 * Update agent config after queuing a message
 */
async function updateAgentAfterQueue(
    agentId: string,
    config: Record<string, unknown>,
    ruleId: string,
    chatId: string,
    safetyConfig: SafetyConfig
): Promise<void> {
    const automationRules = (config.automationRules || []) as AutomationRule[];

    // Update triggered count
    const updatedAutomationRules = automationRules.map(rule =>
        rule.id === ruleId
            ? { ...rule, triggeredCount: (rule.triggeredCount || 0) + 1 }
            : rule
    );

    // Mark chat+rule as replied using the proper function
    const updatedSafety = markAsReplied(chatId, safetyConfig, ruleId);

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            config: JSON.parse(JSON.stringify({
                ...config,
                automationRules: updatedAutomationRules,
                safety: updatedSafety,
            })),
        },
    });
}

// GET - Check cron status
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "linkedin-inbox-monitor",
        timestamp: new Date().toISOString(),
    });
}
