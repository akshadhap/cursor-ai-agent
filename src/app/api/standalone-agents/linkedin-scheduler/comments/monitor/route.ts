import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Comment Monitor API v2
 * Scans specific posts with automations for new comments
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
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

// POST - Run comment monitor for posts with automations
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
        const agentData = (agent.data as Record<string, unknown>) || {};
        const accountId = config.unipileAccountId as string;

        if (!accountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        // Get post automations - these are the specific posts to scan
        const postAutomations = (config.postAutomations || []) as PostAutomation[];
        const enabledAutomations = postAutomations.filter(a => a.enabled && a.keywords.length > 0);

        if (enabledAutomations.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No post automations configured",
                postsScanned: 0,
                commentsProcessed: 0,
                leadMagnetsTriggered: 0,
            });
        }

        logger.info(`[Comment Monitor] Scanning ${enabledAutomations.length} posts with automations`);

        // Get processed comments to avoid duplicates
        const processedComments = (agentData.processedComments || []) as ProcessedComment[];
        const processedIds = new Set(processedComments.map(c => c.commentId));

        // Safety check
        let safetyConfig = initSafetyConfig(config.safety as Partial<SafetyConfig>);
        let analytics = (agentData.analytics || initAnalytics()) as AnalyticsData;

        const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
        const baseUrl = `https://${dsn}/api/v1`;

        let totalProcessed = 0;
        let totalMatched = 0;
        const newProcessedComments: ProcessedComment[] = [];
        const results: { postId: string; comment: string; matched: string | null; action: string }[] = [];

        // For each post with automation, fetch comments
        for (const automation of enabledAutomations) {
            const postId = automation.postId;

            // Check safety limit
            const canSend = canSendMessage(safetyConfig);
            if (!canSend.canSend) {
                logger.info(`[Comment Monitor] Stopping: ${canSend.reason}`);
                break;
            }

            logger.info(`[Comment Monitor] Scanning post: ${postId}`);

            // Fetch post details with comments
            try {
                const postResponse = await fetch(
                    `${baseUrl}/posts/${postId}?account_id=${accountId}`,
                    { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                );

                if (!postResponse.ok) {
                    console.error(`[Comment Monitor] Failed to fetch post ${postId}: ${postResponse.status}`);
                    continue;
                }

                const postDetails = await postResponse.json();
                const comments = postDetails.comments || [];

                logger.info(`[Comment Monitor] Post ${postId} has ${comments.length} comments`);

                // Process each comment
                for (const comment of comments) {
                    const commentData = comment as Record<string, unknown>;
                    const commentId = (commentData.id || commentData.social_id) as string;
                    if (!commentId || processedIds.has(commentId)) continue;

                    // Skip own comments
                    const authorId = (commentData.author as Record<string, unknown>)?.id || commentData.author_id;
                    if (authorId === accountId) continue;

                    totalProcessed++;
                    const commentText = ((commentData.text || "") as string).toLowerCase();
                    const author = commentData.author as Record<string, unknown> || {};
                    const authorName = (author.name || author.display_name || "there") as string;
                    const authorProfileId = (author.provider_id || author.id || authorId) as string;

                    // Check for keyword matches for THIS post's automation
                    const matchedKeyword = automation.keywords.find(kw =>
                        commentText.includes(kw.toLowerCase())
                    );

                    // Mark as processed regardless
                    newProcessedComments.push({
                        commentId,
                        postId,
                        processedAt: new Date().toISOString(),
                    });

                    if (!matchedKeyword) {
                        results.push({
                            postId,
                            comment: commentText.slice(0, 50),
                            matched: null,
                            action: "no_match",
                        });
                        continue;
                    }

                    logger.info(`[Comment Monitor] Match! Keyword: "${matchedKeyword}"`);
                    totalMatched++;

                    // Personalize messages
                    const firstName = authorName.split(" ")[0];
                    const publicReply = automation.publicReply.replace(/\{\{firstName\}\}/g, firstName);
                    const dmMessage = automation.dmMessage.replace(/\{\{firstName\}\}/g, firstName);

                    // Reply to comment publicly
                    try {
                        const replyResponse = await fetch(
                            `${baseUrl}/posts/${postId}/comments`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                                },
                                body: JSON.stringify({
                                    account_id: accountId,
                                    text: publicReply,
                                    reply_to_comment_id: commentId,
                                }),
                            }
                        );

                        if (replyResponse.ok) {
                            logger.info("[Comment Monitor] ✓ Public reply sent");
                        } else {
                            console.error("[Comment Monitor] Public reply failed:", await replyResponse.text());
                        }
                    } catch (error) {
                        console.error("[Comment Monitor] Public reply error:", error);
                    }

                    // Send DM with attachment
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
                            logger.info("[Comment Monitor] ✓ DM sent");
                            safetyConfig = incrementMessageCount(safetyConfig);
                            analytics = updateDailyStats(analytics, "leadMagnets", 1);
                        } else {
                            console.error("[Comment Monitor] DM failed:", await dmResponse.text());
                        }
                    } catch (error) {
                        console.error("[Comment Monitor] DM error:", error);
                    }

                    results.push({
                        postId,
                        comment: commentText.slice(0, 50),
                        matched: matchedKeyword,
                        action: "triggered",
                    });

                    // Update triggered count
                    const automationIndex = postAutomations.findIndex(a => a.postId === automation.postId);
                    if (automationIndex >= 0) {
                        postAutomations[automationIndex].triggeredCount++;
                    }
                }
            } catch (error) {
                console.error(`[Comment Monitor] Error processing post ${postId}:`, error);
            }
        }

        // Save updated data
        const allProcessedComments = [...processedComments, ...newProcessedComments].slice(-1000);

        const updatedConfig = {
            ...config,
            postAutomations,
            safety: safetyConfig,
        };

        const updatedData = {
            ...agentData,
            processedComments: allProcessedComments,
            analytics,
            lastCommentScan: new Date().toISOString(),
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
                data: JSON.parse(JSON.stringify(updatedData)),
            },
        });

        logger.info(`[Comment Monitor] Complete. Processed: ${totalProcessed}, Matched: ${totalMatched}`);

        return NextResponse.json({
            success: true,
            postsScanned: enabledAutomations.length,
            commentsProcessed: totalProcessed,
            leadMagnetsTriggered: totalMatched,
            results: results.slice(0, 10),
        });
    } catch (error) {
        console.error("[Comment Monitor] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Comment monitor failed" },
            { status: 500 }
        );
    }
}

// GET - Get last scan info
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

        const agentData = (agent.data as Record<string, unknown>) || {};
        const config = (agent.config as Record<string, unknown>) || {};
        const postAutomations = (config.postAutomations || []) as PostAutomation[];

        return NextResponse.json({
            success: true,
            lastScan: agentData.lastCommentScan || null,
            processedCount: ((agentData.processedComments || []) as ProcessedComment[]).length,
            activeAutomations: postAutomations.filter(a => a.enabled).length,
        });
    } catch (error) {
        console.error("[Comment Monitor] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get scan info" },
            { status: 500 }
        );
    }
}
