import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - Run Automation API Route
 * Process auto-reply rules for LinkedIn messages
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Unipile API helper
const getUnipileBaseUrl = () => {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    return `https://${dsn}/api/v1`;
};

interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: "new_today" | "all_unread" | "keyword";
    keyword?: string;
    replyMessage: string;
    delay: number;
}

interface ChatItem {
    id: string;
    timestamp?: string;
    updated_at?: string;
    unread_count?: number;
    last_message?: {
        text?: string;
        sender_id?: string;
    };
}

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
        const { agentId } = body;

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
        const unipileAccountId = config.unipileAccountId as string;

        if (!unipileAccountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        const rules = (config.automationRules || []) as AutomationRule[];
        const enabledRules = rules.filter(r => r.enabled);

        if (enabledRules.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No enabled automation rules",
                processed: 0
            });
        }

        const apiKey = process.env.UNIPILE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Unipile API key not configured" }, { status: 500 });
        }

        const baseUrl = getUnipileBaseUrl();

        // Fetch recent chats
        logger.info("[Automation Run] Fetching chats...");
        const chatsResponse = await fetch(
            `${baseUrl}/chats?account_id=${unipileAccountId}&limit=50`,
            {
                headers: {
                    "X-API-KEY": apiKey,
                    "Accept": "application/json",
                },
            }
        );

        if (!chatsResponse.ok) {
            const errorText = await chatsResponse.text();
            console.error("[Automation Run] Failed to fetch chats:", errorText);
            return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
        }

        const chatsData = await chatsResponse.json();
        const chats = (chatsData.items || []) as ChatItem[];

        // Track which chats we've already replied to
        const repliedChats = new Set((config.automationReplied || []) as string[]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let processed = 0;
        const results: Array<{ chatId: string; success: boolean; error?: string }> = [];

        for (const chat of chats) {
            // Skip if already replied
            if (repliedChats.has(chat.id)) {
                continue;
            }

            // Check if chat matches any rule
            // Priority order: keyword rules first, then new_today, then all_unread
            let matchedRule: AutomationRule | null = null;

            // Sort rules by priority: keyword > new_today > all_unread
            const sortedRules = [...enabledRules].sort((a, b) => {
                const priorityMap: Record<string, number> = {
                    keyword: 1,      // Highest priority
                    new_today: 2,
                    all_unread: 3,   // Lowest priority (fallback)
                };
                return (priorityMap[a.trigger] || 99) - (priorityMap[b.trigger] || 99);
            });

            for (const rule of sortedRules) {
                if (rule.trigger === "keyword" && rule.keyword) {
                    // Check if last message contains keyword (highest priority)
                    const lastMessageText = chat.last_message?.text || "";
                    if (lastMessageText.toLowerCase().includes(rule.keyword.toLowerCase())) {
                        matchedRule = rule;
                        break;
                    }
                } else if (rule.trigger === "new_today") {
                    // Check if message is from today
                    const chatTime = new Date(chat.timestamp || chat.updated_at || "");
                    if (chatTime >= today) {
                        matchedRule = rule;
                        break;
                    }
                } else if (rule.trigger === "all_unread") {
                    // Check if chat has unread messages (lowest priority - fallback)
                    if (chat.unread_count && chat.unread_count > 0) {
                        matchedRule = rule;
                        break;
                    }
                }
            }

            if (!matchedRule) {
                continue;
            }

            // Send auto-reply
            logger.info(`[Automation Run] Sending reply to chat ${chat.id} using rule "${matchedRule.name}"`);

            try {
                // Add delay if specified
                if (matchedRule.delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, matchedRule.delay * 1000));
                }

                const sendResponse = await fetch(`${baseUrl}/chats/${chat.id}/messages`, {
                    method: "POST",
                    headers: {
                        "X-API-KEY": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify({
                        text: matchedRule.replyMessage,
                    }),
                });

                if (sendResponse.ok) {
                    repliedChats.add(chat.id);
                    processed++;
                    results.push({ chatId: chat.id, success: true });
                    logger.info(`[Automation Run] ✅ Replied to chat ${chat.id}`);
                } else {
                    const errorText = await sendResponse.text();
                    console.error(`[Automation Run] Failed to reply to ${chat.id}:`, errorText);
                    results.push({ chatId: chat.id, success: false, error: errorText });
                }
            } catch (sendError) {
                console.error(`[Automation Run] Error sending to ${chat.id}:`, sendError);
                results.push({
                    chatId: chat.id,
                    success: false,
                    error: sendError instanceof Error ? sendError.message : "Unknown error"
                });
            }
        }

        // Save replied chats to prevent duplicates
        const updatedConfig = {
            ...config,
            automationReplied: Array.from(repliedChats),
            lastAutomationRun: new Date().toISOString(),
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        logger.info(`[Automation Run] Complete. Processed ${processed} chats.`);

        return NextResponse.json({
            success: true,
            processed,
            results,
            message: processed > 0
                ? `Sent ${processed} auto-replies`
                : "No matching chats to reply to",
        });
    } catch (error) {
        console.error("[Automation Run] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Automation failed" },
            { status: 500 }
        );
    }
}
