import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - LinkedIn Messages API Route
 * Fetch and send LinkedIn messages via Unipile
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Unipile API uses DSN-based URLs
const getUnipileBaseUrl = () => {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    return `https://${dsn}/api/v1`;
};

// GET - Fetch messages/chats
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

        const config = agent.config as Record<string, unknown> || {};
        const unipileAccountId = config.unipileAccountId as string;

        if (!unipileAccountId) {
            return NextResponse.json({ messages: [], connected: false });
        }

        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Unipile API key not configured" }, { status: 500 });
        }

        const baseUrl = getUnipileBaseUrl();
        logger.info(`[Unipile Messages] Fetching chats for account: ${unipileAccountId}`);

        // Fetch chats (conversations) first
        const chatsResponse = await fetch(
            `${baseUrl}/chats?account_id=${unipileAccountId}&limit=50`,
            {
                headers: {
                    "X-API-KEY": apiKey,
                    "Accept": "application/json",
                },
            }
        );

        const chatsText = await chatsResponse.text();
        logger.info(`[Unipile Messages] Chats response: ${chatsResponse.status}`);

        if (!chatsResponse.ok) {
            console.error(`[Unipile Messages] Chats error:`, chatsText);
            return NextResponse.json({ messages: [], connected: true, error: "Failed to fetch chats" });
        }

        const chatsData = JSON.parse(chatsText);

        // For each chat, fetch details to get attendee names
        // The /chats list only returns attendee_provider_id, not names
        const messages = [];

        for (const chat of (chatsData.items || []).slice(0, 30)) {
            const chatId = chat.id;

            let senderName = "LinkedIn Contact";
            let senderTitle = "";
            let messageText = "No messages";

            try {
                // Fetch chat details which includes attendees with names
                const detailsResponse = await fetch(
                    `${baseUrl}/chats/${chatId}`,
                    {
                        headers: {
                            "X-API-KEY": apiKey,
                            "Accept": "application/json",
                        },
                    }
                );

                if (detailsResponse.ok) {
                    const details = await detailsResponse.json();

                    // Log first chat details for debugging
                    if (messages.length === 0) {
                        logger.info(`[Unipile] Chat details keys:`, Object.keys(details).join(', '));
                        if (details.attendees?.[0]) {
                            logger.info(`[Unipile] First attendee:`, JSON.stringify(details.attendees[0]));
                        }
                    }

                    // Extract attendee name from details
                    if (details.attendees && details.attendees.length > 0) {
                        for (const attendee of details.attendees) {
                            const isSelf = attendee.is_self || attendee.is_me;
                            if (!isSelf) {
                                const info = attendee.attendee_info || attendee;
                                senderName = info.display_name || info.name || info.full_name ||
                                    `${info.first_name || ''} ${info.last_name || ''}`.trim() ||
                                    "LinkedIn Contact";
                                senderTitle = info.headline || info.title || info.occupation || "";
                                break;
                            }
                        }
                        // If all are self, use first one
                        if (senderName === "LinkedIn Contact" && details.attendees[0]) {
                            const info = details.attendees[0].attendee_info || details.attendees[0];
                            senderName = info.display_name || info.name || details.name || "LinkedIn Contact";
                        }
                    }

                    // Get last message if available in details
                    if (details.messages && details.messages.length > 0) {
                        const lastMsg = details.messages[details.messages.length - 1];
                        messageText = lastMsg.text || lastMsg.body || lastMsg.content || "No messages";
                    } else if (details.last_message) {
                        messageText = details.last_message.text || details.last_message.body || "No messages";
                    }
                }
            } catch (err) {
                console.error(`[Unipile] Error fetching chat ${chatId}:`, err);
            }

            messages.push({
                id: chatId,
                senderId: chat.attendee_provider_id || "",
                senderName: senderName,
                senderTitle: senderTitle,
                senderAvatar: "",
                content: messageText,
                timestamp: chat.timestamp,
                isRead: chat.unread_count === 0,
                isAutomated: false,
                conversationId: chatId,
                unreadCount: chat.unread_count || 0,
            });
        }

        logger.info(`[Unipile Messages] Found ${messages.length} chats, first sender: ${messages[0]?.senderName || 'unknown'}`);
        return NextResponse.json({ success: true, messages, connected: true });
    } catch (error) {
        console.error("[Unipile Messages] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Fetch failed", messages: [], connected: true },
            { status: 500 }
        );
    }
}

// POST - Send message
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
        const { agentId, conversationId, content } = body;

        if (!agentId || !conversationId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as Record<string, unknown> || {};
        const unipileAccountId = config.unipileAccountId as string;

        if (!unipileAccountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Unipile API key not configured" }, { status: 500 });
        }

        const baseUrl = getUnipileBaseUrl();
        logger.info(`[Unipile Send] Sending to conversation: ${conversationId}`);

        const response = await fetch(`${baseUrl}/chats/${conversationId}/messages`, {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                text: content,
            }),
        });

        const responseText = await response.text();
        logger.info(`[Unipile Send] Response: ${response.status}`, responseText);

        if (!response.ok) {
            console.error(`[Unipile Send] Error: ${response.status}`, responseText);
            return NextResponse.json(
                { error: `Failed to send message: ${response.status}` },
                { status: response.status }
            );
        }

        const data = JSON.parse(responseText);
        logger.info(`[Unipile Send] Success:`, data.id || data.object);

        return NextResponse.json({ success: true, messageId: data.id });
    } catch (error) {
        console.error("[Unipile Send] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Send failed" },
            { status: 500 }
        );
    }
}
