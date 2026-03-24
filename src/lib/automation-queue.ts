/**
 * Automation Queue Library
 * Handles queue-based humanized message processing for LinkedIn automation
 * 
 * Messages are queued with a scheduled send time and processed one at a time
 * by a cron job to simulate human-like behavior.
 */

import prisma from "@/lib/db";

// ============================================
// TYPES
// ============================================

export type QueuedMessageType = 'dm_reply' | 'comment_reply' | 'lead_magnet';
export type QueuedMessageStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface QueuedMessage {
    id: string;
    type: QueuedMessageType;
    createdAt: string;
    scheduledFor: string;  // When to actually send (ISO string)
    status: QueuedMessageStatus;

    // Message details
    chatId?: string;       // For DM replies
    postId?: string;       // For comments
    commentId?: string;    // For comment replies
    recipientId: string;
    recipientName: string;
    message: string;
    attachmentUrl?: string;

    // Rule tracking for automation pointers
    ruleId?: string;        // Links to the automation rule that triggered this
    ruleName?: string;      // Name of the rule for display

    // For lead magnets - also need public reply
    publicReply?: string;

    // Tracking
    attempts: number;
    lastError?: string;
    sentAt?: string;
}

export interface QueueConfig {
    minDelaySeconds: number;  // Default: 45
    maxDelaySeconds: number;  // Default: 90
    maxRetries: number;       // Default: 3
    quietHoursStart?: number; // 0-23, e.g., 22 for 10 PM
    quietHoursEnd?: number;   // 0-23, e.g., 7 for 7 AM
    enabled: boolean;         // Master switch
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
    minDelaySeconds: 20,  // Minimum 20 seconds delay
    maxDelaySeconds: 45,  // Maximum 45 seconds delay
    maxRetries: 3,
    enabled: true,
};

// ============================================
// QUEUE HELPERS
// ============================================

/**
 * Generate a unique queue message ID
 */
export function generateQueueId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate the next send time with random delay
 */
export function calculateScheduledTime(config: QueueConfig): string {
    const now = new Date();
    const delayRange = config.maxDelaySeconds - config.minDelaySeconds;
    const randomDelay = config.minDelaySeconds + Math.random() * delayRange;

    const scheduledTime = new Date(now.getTime() + randomDelay * 1000);

    // Check quiet hours
    if (config.quietHoursStart !== undefined && config.quietHoursEnd !== undefined) {
        const hour = scheduledTime.getHours();
        const isQuietHour = config.quietHoursStart > config.quietHoursEnd
            ? (hour >= config.quietHoursStart || hour < config.quietHoursEnd)
            : (hour >= config.quietHoursStart && hour < config.quietHoursEnd);

        if (isQuietHour) {
            // Schedule for end of quiet hours
            scheduledTime.setHours(config.quietHoursEnd, 0, 0, 0);
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }
        }
    }

    return scheduledTime.toISOString();
}

/**
 * Add a message to the queue
 */
export async function addToQueue(
    agentId: string,
    message: Omit<QueuedMessage, 'id' | 'createdAt' | 'scheduledFor' | 'status' | 'attempts'>
): Promise<QueuedMessage> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) {
        throw new Error("Agent not found");
    }

    const config = (agent.config as Record<string, unknown>) || {};
    const data = (agent.data as Record<string, unknown>) || {};
    const queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...(config.queueConfig as Partial<QueueConfig>) };

    // Get existing queue
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    // DEDUPLICATION: Check if there's already a pending/processing message for this chat
    if (message.chatId) {
        const existingPending = messageQueue.find(
            m => m.chatId === message.chatId && (m.status === 'pending' || m.status === 'processing')
        );
        if (existingPending) {
            console.log(`[Queue] Skipping duplicate - already pending for chat ${message.chatId}`);
            return existingPending;
        }

        // Also check for recently sent messages (within last 5 minutes) to prevent rapid duplicates
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentlySent = messageQueue.find(
            m => m.chatId === message.chatId &&
                m.status === 'sent' &&
                m.sentAt &&
                new Date(m.sentAt).getTime() > fiveMinutesAgo
        );
        if (recentlySent) {
            console.log(`[Queue] Skipping duplicate - already sent to chat ${message.chatId} at ${recentlySent.sentAt}`);
            return recentlySent;
        }
    }

    const queuedMessage: QueuedMessage = {
        ...message,
        id: generateQueueId(),
        createdAt: new Date().toISOString(),
        scheduledFor: calculateScheduledTime(queueConfig),
        status: 'pending',
        attempts: 0,
    };

    // Add to queue
    messageQueue.push(queuedMessage);

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            data: JSON.parse(JSON.stringify({
                ...data,
                messageQueue,
            })),
        },
    });

    console.log(`[Queue] Added message ${queuedMessage.id} scheduled for ${queuedMessage.scheduledFor}`);
    return queuedMessage;
}

/**
 * Get the next message to process (oldest pending that's due)
 */
export async function getNextPendingMessage(
    agentId: string
): Promise<QueuedMessage | null> {
    const messages = await getAllPendingMessages(agentId, 1);
    return messages[0] || null;
}

/**
 * Get ALL pending messages that are due (for batch processing)
 * Returns up to `limit` messages, sorted by scheduled time
 */
export async function getAllPendingMessages(
    agentId: string,
    limit: number = 10
): Promise<QueuedMessage[]> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return [];

    const data = (agent.data as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    const now = new Date();

    // Debug logging
    const allPending = messageQueue.filter(m => m.status === 'pending');
    if (allPending.length > 0) {
        const dueCount = allPending.filter(m => new Date(m.scheduledFor) <= now).length;
        console.log(`[Queue Debug] Agent ${agentId}: ${allPending.length} pending, ${dueCount} due now`);
    }

    // Find all pending messages that are due
    const pendingMessages = messageQueue
        .filter(m => m.status === 'pending' && new Date(m.scheduledFor) <= now)
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
        .slice(0, limit);

    return pendingMessages;
}

/**
 * Mark a message as processing
 */
export async function markAsProcessing(
    agentId: string,
    messageId: string
): Promise<void> {
    await updateMessageStatus(agentId, messageId, 'processing');
}

/**
 * Mark a message as sent
 */
export async function markAsSent(
    agentId: string,
    messageId: string
): Promise<void> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return;

    const data = (agent.data as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    const updatedQueue = messageQueue.map(m =>
        m.id === messageId
            ? { ...m, status: 'sent' as QueuedMessageStatus, sentAt: new Date().toISOString() }
            : m
    );

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            data: JSON.parse(JSON.stringify({
                ...data,
                messageQueue: updatedQueue,
            })),
        },
    });

    console.log(`[Queue] Message ${messageId} marked as sent`);
}

/**
 * Mark a message as failed
 */
export async function markAsFailed(
    agentId: string,
    messageId: string,
    error: string
): Promise<void> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return;

    const data = (agent.data as Record<string, unknown>) || {};
    const config = (agent.config as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];
    const queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...(config.queueConfig as Partial<QueueConfig>) };

    const updatedQueue = messageQueue.map(m => {
        if (m.id !== messageId) return m;

        const attempts = m.attempts + 1;
        // If under max retries, reschedule; otherwise mark as failed
        if (attempts < queueConfig.maxRetries) {
            return {
                ...m,
                status: 'pending' as QueuedMessageStatus,
                attempts,
                lastError: error,
                scheduledFor: calculateScheduledTime(queueConfig), // Reschedule
            };
        } else {
            return {
                ...m,
                status: 'failed' as QueuedMessageStatus,
                attempts,
                lastError: error,
            };
        }
    });

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            data: JSON.parse(JSON.stringify({
                ...data,
                messageQueue: updatedQueue,
            })),
        },
    });

    console.log(`[Queue] Message ${messageId} marked as failed: ${error}`);
}

/**
 * Update message status helper
 */
async function updateMessageStatus(
    agentId: string,
    messageId: string,
    status: QueuedMessageStatus
): Promise<void> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return;

    const data = (agent.data as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    const updatedQueue = messageQueue.map(m =>
        m.id === messageId ? { ...m, status } : m
    );

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            data: JSON.parse(JSON.stringify({
                ...data,
                messageQueue: updatedQueue,
            })),
        },
    });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(agentId: string): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    nextScheduled: string | null;
}> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) {
        return { pending: 0, processing: 0, sent: 0, failed: 0, nextScheduled: null };
    }

    const data = (agent.data as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    const pending = messageQueue.filter(m => m.status === 'pending').length;
    const processing = messageQueue.filter(m => m.status === 'processing').length;
    const sent = messageQueue.filter(m => m.status === 'sent').length;
    const failed = messageQueue.filter(m => m.status === 'failed').length;

    const pendingMessages = messageQueue
        .filter(m => m.status === 'pending')
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

    return {
        pending,
        processing,
        sent,
        failed,
        nextScheduled: pendingMessages[0]?.scheduledFor || null,
    };
}

/**
 * Clean old sent/failed messages (older than 7 days)
 */
export async function cleanOldMessages(agentId: string): Promise<number> {
    const agent = await prisma.standaloneAgent.findUnique({
        where: { id: agentId },
    });

    if (!agent) return 0;

    const data = (agent.data as Record<string, unknown>) || {};
    const messageQueue = Array.isArray(data.messageQueue) ? data.messageQueue as QueuedMessage[] : [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const originalLength = messageQueue.length;
    const cleanedQueue = messageQueue.filter(m => {
        if (m.status === 'pending' || m.status === 'processing') return true;
        const createdAt = new Date(m.createdAt);
        return createdAt > sevenDaysAgo;
    });

    if (cleanedQueue.length < originalLength) {
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify({
                    ...data,
                    messageQueue: cleanedQueue,
                })),
            },
        });
    }

    return originalLength - cleanedQueue.length;
}
