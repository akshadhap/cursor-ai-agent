/**
 * LinkedIn Scheduler - Cron Job for Scheduled Posts
 * Processes scheduled posts when their scheduled time has passed
 * No authentication required (should be protected by cron secret)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface LinkedInPost {
    id: string;
    content: string;
    category?: string;
    status: "draft" | "scheduled" | "posted" | "failed";
    scheduledAt: string | null;
    postedAt: string | null;
    createdAt: string;
    updatedAt: string;
    unipilePostId?: string;
    imageUrl?: string;
    error?: string;
}

// POST - Run cron job for scheduled posts
export async function POST(req: NextRequest) {
    try {
        // Verify cron secret (for security)
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Post Scheduler] Starting scheduled post processor...");

        const now = new Date();

        // Find all LinkedIn scheduler agents
        const agents = await prisma.standaloneAgent.findMany({
            where: {
                type: "LINKEDIN_SCHEDULER",
            },
        });

        console.log(`[Post Scheduler] Found ${agents.length} LinkedIn scheduler agents`);

        const results: {
            agentId: string;
            userId: string;
            scheduledFound: number;
            posted: number;
            failed: number;
            errors: string[];
        }[] = [];

        const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
        const baseUrl = `https://${dsn}/api/v1`;
        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Unipile API key not configured" }, { status: 500 });
        }

        for (const agent of agents) {
            const config = (agent.config as Record<string, unknown>) || {};
            const agentData = (agent.data as Record<string, unknown>) || {};
            const accountId = config.unipileAccountId as string;

            // Skip if not connected to Unipile
            if (!accountId) {
                continue;
            }

            const posts = (agentData.posts || []) as LinkedInPost[];

            // Find scheduled posts that are due
            const duePosts = posts.filter(post => {
                if (post.status !== "scheduled" || !post.scheduledAt) return false;
                const scheduledTime = new Date(post.scheduledAt);
                return scheduledTime <= now;
            });

            if (duePosts.length === 0) {
                continue;
            }

            console.log(`[Post Scheduler] Agent ${agent.id}: Found ${duePosts.length} due posts`);

            const agentResult = {
                agentId: agent.id,
                userId: agent.userId,
                scheduledFound: duePosts.length,
                posted: 0,
                failed: 0,
                errors: [] as string[],
            };

            // Process each due post
            for (const post of duePosts) {
                try {
                    console.log(`[Post Scheduler] Posting: ${post.id} - "${post.content.slice(0, 50)}..."`);

                    // Create post via Unipile
                    const postBody: Record<string, unknown> = {
                        account_id: accountId,
                        text: post.content,
                    };

                    if (post.imageUrl) {
                        postBody.media = [{ url: post.imageUrl, type: "IMAGE" }];
                    }

                    const response = await fetch(`${baseUrl}/posts`, {
                        method: "POST",
                        headers: {
                            "X-API-KEY": apiKey,
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        body: JSON.stringify(postBody),
                    });

                    const responseText = await response.text();

                    if (response.ok) {
                        const postData = JSON.parse(responseText);
                        console.log(`[Post Scheduler] ✓ Posted successfully: ${postData.id || post.id}`);

                        // Update post status to "posted"
                        const postIndex = posts.findIndex(p => p.id === post.id);
                        if (postIndex >= 0) {
                            posts[postIndex] = {
                                ...posts[postIndex],
                                status: "posted",
                                postedAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                unipilePostId: postData.id,
                            };
                        }
                        agentResult.posted++;
                    } else {
                        console.error(`[Post Scheduler] ✗ Failed to post: ${response.status}`, responseText);

                        // Update post status to "failed"
                        const postIndex = posts.findIndex(p => p.id === post.id);
                        if (postIndex >= 0) {
                            posts[postIndex] = {
                                ...posts[postIndex],
                                status: "failed",
                                updatedAt: new Date().toISOString(),
                                error: `Failed: ${response.status} - ${responseText.slice(0, 100)}`,
                            };
                        }
                        agentResult.failed++;
                        agentResult.errors.push(`Post ${post.id}: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`[Post Scheduler] Error posting ${post.id}:`, error);

                    const postIndex = posts.findIndex(p => p.id === post.id);
                    if (postIndex >= 0) {
                        posts[postIndex] = {
                            ...posts[postIndex],
                            status: "failed",
                            updatedAt: new Date().toISOString(),
                            error: error instanceof Error ? error.message : "Unknown error",
                        };
                    }
                    agentResult.failed++;
                    agentResult.errors.push(`Post ${post.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
            }

            // Save updated posts back to agent data
            await prisma.standaloneAgent.update({
                where: { id: agent.id },
                data: {
                    data: JSON.parse(JSON.stringify({
                        ...agentData,
                        posts,
                        lastSchedulerRun: new Date().toISOString(),
                    })),
                },
            });

            results.push(agentResult);
        }

        const totalPosted = results.reduce((sum, r) => sum + r.posted, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
        const totalScheduled = results.reduce((sum, r) => sum + r.scheduledFound, 0);

        console.log(`[Post Scheduler] Complete. Scheduled: ${totalScheduled}, Posted: ${totalPosted}, Failed: ${totalFailed}`);

        return NextResponse.json({
            success: true,
            agentsProcessed: results.length,
            totalScheduledFound: totalScheduled,
            totalPosted,
            totalFailed,
            results,
        });
    } catch (error) {
        console.error("[Post Scheduler] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Cron job failed" },
            { status: 500 }
        );
    }
}

// GET - Check cron status
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "LinkedIn Post Scheduler Cron",
        usage: "POST to this endpoint to process all due scheduled posts",
        tip: "Set up a cron job to call this endpoint every 1-5 minutes",
    });
}
