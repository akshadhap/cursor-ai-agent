import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Cron Job for Comment Monitoring
 * Processes ALL LinkedIn scheduler agents with active post automations
 * No authentication required (should be protected by cron secret)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
    canSendMessage,
    incrementMessageCount,
    initSafetyConfig,
    initAnalytics,
    updateDailyStats,
    type SafetyConfig,
    type AnalyticsData,
} from "@/lib/linkedin-safety";

interface PostAutomation {
    postId: string;
    postUrl: string;
    postText: string;
    keywords: string[];
    publicReply: string;
    dmMessage: string;
    attachmentUrl?: string;
    enabled: boolean;
    triggeredCount: number;
}

interface ProcessedComment {
    commentId: string;
    postId: string;
    processedAt: string;
}

// POST - Run cron job for all agents
export async function POST(req: NextRequest) {
    try {
        // Verify cron secret (for security)
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.info("[Cron] Starting comment monitor for all agents...");

        // Find all LinkedIn scheduler agents
        const agents = await prisma.standaloneAgent.findMany({
            where: {
                type: "LINKEDIN_SCHEDULER",
            },
        });

        logger.info(`[Cron] Found ${agents.length} LinkedIn scheduler agents`);

        const results: {
            agentId: string;
            userId: string;
            postsScanned: number;
            commentsProcessed: number;
            triggered: number;
            error?: string;
        }[] = [];

        for (const agent of agents) {
            const config = (agent.config as Record<string, unknown>) || {};
            const agentData = (agent.data as Record<string, unknown>) || {};
            const accountId = config.unipileAccountId as string;

            // Skip if not connected to Unipile
            if (!accountId) {
                continue;
            }

            // Get post automations (new model)
            const postAutomations = (config.postAutomations || []) as PostAutomation[];
            const enabledAutomations = postAutomations.filter(a => a.enabled && a.keywords.length > 0);

            // Skip if no enabled automations
            if (enabledAutomations.length === 0) {
                continue;
            }

            try {
                const result = await processAgentPostAutomations(agent.id, config, agentData, accountId, postAutomations, enabledAutomations);
                results.push({
                    agentId: agent.id,
                    userId: agent.userId,
                    ...result,
                });
            } catch (error) {
                console.error(`[Cron] Error processing agent ${agent.id}:`, error);
                results.push({
                    agentId: agent.id,
                    userId: agent.userId,
                    postsScanned: 0,
                    commentsProcessed: 0,
                    triggered: 0,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const totalTriggered = results.reduce((sum, r) => sum + r.triggered, 0);
        const totalProcessed = results.reduce((sum, r) => sum + r.commentsProcessed, 0);

        logger.info(`[Cron] Complete. Agents: ${results.length}, Comments: ${totalProcessed}, Triggered: ${totalTriggered}`);

        return NextResponse.json({
            success: true,
            agentsProcessed: results.length,
            totalCommentsProcessed: totalProcessed,
            totalTriggered,
            results,
        });
    } catch (error) {
        console.error("[Cron] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Cron job failed" },
            { status: 500 }
        );
    }
}

async function processAgentPostAutomations(
    agentId: string,
    config: Record<string, unknown>,
    agentData: Record<string, unknown>,
    accountId: string,
    postAutomations: PostAutomation[],
    enabledAutomations: PostAutomation[]
): Promise<{ postsScanned: number; commentsProcessed: number; triggered: number }> {
    const processedComments = (agentData.processedComments || []) as ProcessedComment[];
    const processedIds = new Set(processedComments.map(c => c.commentId));

    let safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);
    let analytics = (agentData.analytics || initAnalytics()) as AnalyticsData;

    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    const baseUrl = `https://${dsn}/api/v1`;

    let totalProcessed = 0;
    let totalMatched = 0;
    const newProcessedComments: ProcessedComment[] = [];
    const newHistoryEntries: Array<Record<string, unknown>> = []; // Track for history

    // Process each post with automation
    for (const automation of enabledAutomations) {
        const postId = automation.postId;
        logger.info(`[Cron] Processing post: ${postId}`);
        logger.info(`[Cron] Keywords: ${automation.keywords.join(", ")}`);

        const canSend = canSendMessage(safetyConfig);
        if (!canSend.canSend) break;

        // Fetch post with comments
        try {
            const postUrl = `${baseUrl}/posts/${postId}?account_id=${accountId}`;
            logger.info(`[Cron] Fetching post: ${postUrl}`);

            const postDetailsResponse = await fetch(postUrl, {
                headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" },
            });

            logger.info(`[Cron] Response status: ${postDetailsResponse.status}`);

            if (!postDetailsResponse.ok) {
                const errorText = await postDetailsResponse.text();
                logger.info(`[Cron] Error fetching post: ${errorText}`);
                continue;
            }

            const postDetails = await postDetailsResponse.json();
            const socialId = postDetails.social_id || postId;
            logger.info(`[Cron] Post social_id: ${socialId}`);
            logger.info(`[Cron] comment_counter: ${postDetails.comment_counter}`);

            // Try to get comments - Method 1: from post response
            let comments = postDetails.comments || [];

            // Method 2: Try dedicated comments endpoint
            if (comments.length === 0 && postDetails.comment_counter > 0) {
                logger.info(`[Cron] Trying dedicated comments endpoint...`);
                try {
                    const commentsResponse = await fetch(
                        `${baseUrl}/posts/${socialId}/comments?account_id=${accountId}`,
                        { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                    );
                    if (commentsResponse.ok) {
                        const commentsData = await commentsResponse.json();
                        logger.info(`[Cron] Comments endpoint response:`, JSON.stringify(commentsData).slice(0, 500));
                        comments = commentsData.items || commentsData.comments || commentsData || [];
                        if (Array.isArray(comments)) {
                            logger.info(`[Cron] Found ${comments.length} comments from endpoint`);
                        }
                    } else {
                        logger.info(`[Cron] Comments endpoint failed: ${commentsResponse.status}`);
                    }
                } catch (e) {
                    logger.info(`[Cron] Comments endpoint error: ${e}`);
                }
            }

            // Method 3: Try with urn format
            if (comments.length === 0 && postDetails.comment_counter > 0) {
                logger.info(`[Cron] Trying with urn format...`);
                try {
                    const urnId = `urn:li:activity:${postId}`;
                    const urnResponse = await fetch(
                        `${baseUrl}/posts/${encodeURIComponent(urnId)}/comments?account_id=${accountId}`,
                        { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                    );
                    if (urnResponse.ok) {
                        const urnData = await urnResponse.json();
                        logger.info(`[Cron] URN endpoint response:`, JSON.stringify(urnData).slice(0, 500));
                        comments = urnData.items || urnData.comments || urnData || [];
                    }
                } catch (e) {
                    logger.info(`[Cron] URN endpoint error: ${e}`);
                }
            }

            logger.info(`[Cron] Final comments count: ${Array.isArray(comments) ? comments.length : 'not array'}`);

            for (const comment of comments) {
                const commentData = comment as Record<string, unknown>;
                const commentId = (commentData.id || commentData.social_id) as string;
                if (!commentId || processedIds.has(commentId)) {
                    logger.info(`[Cron] Skipping comment ${commentId}: already processed`);
                    continue;
                }

                // author is a string (name), author_details has the ID
                const authorDetails = commentData.author_details as Record<string, unknown> || {};
                const authorId = (authorDetails.id || commentData.author_id) as string;

                // Skip own comments
                if (authorId === accountId || authorId?.includes(accountId)) {
                    logger.info(`[Cron] Skipping own comment`);
                    continue;
                }

                totalProcessed++;
                const commentText = ((commentData.text || "") as string).toLowerCase();
                // author is just a string name in Unipile format
                const authorName = (commentData.author || "there") as string;
                const authorProfileId = (authorDetails.id || authorId) as string;

                logger.info(`[Cron] Comment: "${commentText.slice(0, 30)}" by ${authorName}`);

                const matchedKeyword = automation.keywords.find(kw =>
                    commentText.includes(kw.toLowerCase())
                );

                newProcessedComments.push({
                    commentId,
                    postId,
                    processedAt: new Date().toISOString(),
                });

                if (!matchedKeyword) continue;

                totalMatched++;
                const firstName = authorName.split(" ")[0];
                // Support both #name and {{firstName}} for variable replacement
                const publicReply = automation.publicReply
                    .replace(/#name/g, firstName)
                    .replace(/\{\{firstName\}\}/g, firstName);
                const dmMessage = automation.dmMessage
                    .replace(/#name/g, firstName)
                    .replace(/\{\{firstName\}\}/g, firstName);

                // Reply to comment as a threaded reply
                try {
                    // Use the comment ID directly for threaded replies
                    logger.info(`[Cron] Replying to comment ID: ${commentId}`);

                    const replyBody = {
                        account_id: accountId,
                        text: publicReply,
                        comment_id: commentId, // This makes it a threaded reply
                    };

                    logger.info(`[Cron] Reply body:`, JSON.stringify(replyBody));

                    const replyResponse = await fetch(`${baseUrl}/posts/${postId}/comments`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                        },
                        body: JSON.stringify(replyBody),
                    });

                    if (replyResponse.ok) {
                        const responseData = await replyResponse.json();
                        logger.info(`[Cron] ✓ Reply response:`, JSON.stringify(responseData).slice(0, 200));

                        // Add to history
                        newHistoryEntries.push({
                            id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            type: automation.dmMessage ? 'lead_capture' : 'comment_reply',
                            ruleName: automation.dmMessage ? 'Lead Magnet' : 'Comment Reply',
                            triggerKeyword: matchedKeyword,
                            recipientName: authorName,
                            message: publicReply.substring(0, 100),
                            postId: postId,  // For navigating to source post
                            postUrl: automation.postUrl,  // LinkedIn post URL
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        const errorText = await replyResponse.text();
                        logger.info(`[Cron] Reply failed: ${replyResponse.status} - ${errorText}`);
                    }
                } catch (error) {
                    console.error("[Cron] Reply error:", error);
                }

                // Send DM
                try {
                    const dmBody: Record<string, unknown> = {
                        account_id: accountId,
                        attendees_ids: [authorProfileId],
                        text: dmMessage,
                    };

                    if (automation.attachmentUrl) {
                        dmBody.attachments = [{ url: automation.attachmentUrl }];
                    }

                    const dmResponse = await fetch(`${baseUrl}/chats`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                        },
                        body: JSON.stringify(dmBody),
                    });

                    if (dmResponse.ok) {
                        safetyConfig = incrementMessageCount(safetyConfig);
                        analytics = updateDailyStats(analytics, "leadMagnets", 1);
                    }
                } catch (error) {
                    console.error("[Cron] DM error:", error);
                }

                // Update triggered count
                const automationIndex = postAutomations.findIndex(a => a.postId === automation.postId);
                if (automationIndex >= 0) {
                    postAutomations[automationIndex].triggeredCount++;
                }
            }
        } catch (error) {
            console.error(`[Cron] Error fetching post ${postId}:`, error);
        }
    }

    // Save updates
    const allProcessedComments = [...processedComments, ...newProcessedComments].slice(-1000);

    // Add to automation history for History tab (Comments section)
    const existingHistory = Array.isArray(agentData.automationHistory)
        ? agentData.automationHistory as Array<Record<string, unknown>>
        : [];

    // Combine existing history with new entries
    const automationHistory = [...newHistoryEntries, ...existingHistory];

    await prisma.standaloneAgent.update({
        where: { id: agentId },
        data: {
            config: JSON.parse(JSON.stringify({
                ...config,
                postAutomations,
                safety: safetyConfig,
            })),
            data: JSON.parse(JSON.stringify({
                ...agentData,
                processedComments: allProcessedComments,
                analytics,
                automationHistory: automationHistory.slice(0, 100),
                lastCommentScan: new Date().toISOString(),
            })),
        },
    });

    return {
        postsScanned: enabledAutomations.length,
        commentsProcessed: totalProcessed,
        triggered: totalMatched,
    };
}

// GET - Check cron status
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "LinkedIn Comment Monitor Cron",
        usage: "POST to this endpoint to scan all agents for new comments",
    });
}
