import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Fetch User's LinkedIn Posts + Add by URL
 * Shows posts from our database + posts with comment automations
 * Supports adding posts by URL
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

interface FormattedPost {
    id: string;
    socialId: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    reactions: number;
    comments: number;
    shares: number;
    authorName: string;
    linkedInUrl: string;
    source: 'app' | 'automation' | 'manual';
    hasAutomation: boolean;
}

interface AgentPost {
    id: string;
    content: string;
    imageUrl?: string;
    status: string;
    unipilePostId?: string;  // This is what post-scheduler saves
    linkedinPostId?: string; // Legacy field
    scheduledAt?: string;
    postedAt?: string;
}

interface AgentData {
    posts?: AgentPost[];
    commentAutomations?: Array<{
        id: string;
        postId?: string;
        postUrl?: string;
        name?: string;
        enabled?: boolean;
    }>;
    importedPosts?: Array<{
        id: string;
        socialId: string;
        content: string;
        imageUrl: string | null;
        createdAt: string;
        reactions: number;
        comments: number;
        shares: number;
        linkedInUrl: string;
        importedAt: string;
    }>;
}

// GET - Fetch user's posts
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const agentId = url.searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get agent with config and data
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const accountId = config.unipileAccountId as string | undefined;
        const agentData = (agent.data as AgentData) || {};

        const allPosts: FormattedPost[] = [];
        const seenPostIds = new Set<string>();

        // Source 1: Posts created through our app (check BOTH unipilePostId and linkedinPostId)
        if (agentData.posts && Array.isArray(agentData.posts)) {
            const appPosts = agentData.posts
                .filter(p => p.status === 'posted' && (p.unipilePostId || p.linkedinPostId))
                .map(p => {
                    const postId = p.unipilePostId || p.linkedinPostId!;
                    seenPostIds.add(postId);
                    return {
                        id: p.id,
                        socialId: postId,
                        content: p.content?.substring(0, 300) || '',
                        imageUrl: p.imageUrl || null,
                        createdAt: p.postedAt || p.scheduledAt || new Date().toISOString(),
                        reactions: 0,
                        comments: 0,
                        shares: 0,
                        authorName: 'You',
                        linkedInUrl: `https://www.linkedin.com/feed/update/urn:li:activity:${postId}`,
                        source: 'app' as const,
                        hasAutomation: false,
                    };
                });

            allPosts.push(...appPosts);
            logger.info(`[My Posts] Found ${appPosts.length} posts from app database`);
        }

        // Source 2: Manually imported posts
        if (agentData.importedPosts && Array.isArray(agentData.importedPosts)) {
            for (const imported of agentData.importedPosts) {
                if (!seenPostIds.has(imported.socialId)) {
                    seenPostIds.add(imported.socialId);
                    allPosts.push({
                        ...imported,
                        source: 'manual' as const,
                        hasAutomation: false,
                        authorName: 'You',
                    });
                }
            }
            logger.info(`[My Posts] Found ${agentData.importedPosts.length} manually imported posts`);
        }

        // Source 3: Posts with comment automations (fetch details from Unipile)
        if (agentData.commentAutomations && Array.isArray(agentData.commentAutomations) && accountId) {
            const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
            const baseUrl = `https://${dsn}/api/v1`;
            const apiKey = process.env.UNIPILE_API_KEY || "";

            logger.info(`[My Posts] Found ${agentData.commentAutomations.length} comment automations`);

            for (const automation of agentData.commentAutomations) {
                const postId = automation.postId;
                if (!postId || seenPostIds.has(postId)) continue;

                seenPostIds.add(postId);

                try {
                    const postResponse = await fetch(
                        `${baseUrl}/posts/${postId}?account_id=${accountId}`,
                        { headers: { "X-API-KEY": apiKey } }
                    );

                    if (postResponse.ok) {
                        const postData = await postResponse.json();

                        let imageUrl: string | null = null;
                        if (postData.media && Array.isArray(postData.media) && postData.media.length > 0) {
                            const imageMedia = postData.media.find((m: { type?: string }) =>
                                m.type === 'image' || m.type === 'IMAGE' || m.type === 'photo'
                            );
                            imageUrl = imageMedia?.url || postData.media[0]?.url || null;
                        }

                        allPosts.push({
                            id: postId,
                            socialId: postData.social_id || postId,
                            content: (postData.text || postData.content || "").substring(0, 300),
                            imageUrl,
                            createdAt: postData.created_time || new Date().toISOString(),
                            reactions: postData.reactions_count || 0,
                            comments: postData.comment_counter || 0,
                            shares: postData.share_count || 0,
                            authorName: 'You',
                            linkedInUrl: automation.postUrl || `https://www.linkedin.com/feed/update/urn:li:activity:${postId}`,
                            source: 'automation' as const,
                            hasAutomation: true,
                        });
                    }
                } catch (error) {
                    console.error(`[My Posts] Error fetching post ${postId}:`, error);
                }
            }
        }

        // Sort by date descending
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        logger.info(`[My Posts] Returning ${allPosts.length} total posts`);

        return NextResponse.json({
            success: true,
            posts: allPosts,
            total: allPosts.length,
        });
    } catch (error) {
        console.error("[My Posts] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch posts" },
            { status: 500 }
        );
    }
}

// POST - Add a post by URL
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { agentId, postUrl } = body;

        if (!agentId || !postUrl) {
            return NextResponse.json({ error: "Missing agentId or postUrl" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const accountId = config.unipileAccountId as string | undefined;

        if (!accountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        // Extract post ID from URL
        // Formats: 
        // https://www.linkedin.com/feed/update/urn:li:activity:7411768243947995136/
        // https://www.linkedin.com/posts/username_something-7411768243947995136-xxxx
        let postId: string | null = null;

        const activityMatch = postUrl.match(/urn:li:activity:(\d+)/);
        if (activityMatch) {
            postId = activityMatch[1];
        } else {
            const postsMatch = postUrl.match(/-(\d{19,20})-/);
            if (postsMatch) {
                postId = postsMatch[1];
            } else {
                const numberMatch = postUrl.match(/(\d{19,20})/);
                if (numberMatch) {
                    postId = numberMatch[1];
                }
            }
        }

        if (!postId) {
            return NextResponse.json({
                error: "Could not extract post ID from URL. Please use a valid LinkedIn post URL."
            }, { status: 400 });
        }

        logger.info(`[My Posts] Adding post by URL: ${postId}`);

        // Fetch post details from Unipile
        const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
        const baseUrl = `https://${dsn}/api/v1`;
        const apiKey = process.env.UNIPILE_API_KEY || "";

        const postResponse = await fetch(
            `${baseUrl}/posts/${postId}?account_id=${accountId}`,
            { headers: { "X-API-KEY": apiKey } }
        );

        if (!postResponse.ok) {
            const errorText = await postResponse.text();
            console.error(`[My Posts] Failed to fetch post: ${postResponse.status}`, errorText);
            return NextResponse.json({
                error: "Could not fetch post details. Make sure the post exists and you have access."
            }, { status: 400 });
        }

        const postData = await postResponse.json();

        let imageUrl: string | null = null;
        if (postData.media && Array.isArray(postData.media) && postData.media.length > 0) {
            const imageMedia = postData.media.find((m: { type?: string }) =>
                m.type === 'image' || m.type === 'IMAGE' || m.type === 'photo'
            );
            imageUrl = imageMedia?.url || postData.media[0]?.url || null;
        }

        // Save to imported posts
        const agentData = (agent.data as AgentData) || {};
        const importedPosts = agentData.importedPosts || [];

        // Check if already imported
        if (importedPosts.some(p => p.socialId === postId)) {
            return NextResponse.json({ error: "Post already added" }, { status: 400 });
        }

        importedPosts.push({
            id: `imported-${postId}`,
            socialId: postId,
            content: (postData.text || postData.content || "").substring(0, 300),
            imageUrl,
            createdAt: postData.created_time || new Date().toISOString(),
            reactions: postData.reactions_count || 0,
            comments: postData.comment_counter || 0,
            shares: postData.share_count || 0,
            linkedInUrl: postUrl,
            importedAt: new Date().toISOString(),
        });

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify({
                    ...agentData,
                    importedPosts,
                })),
            },
        });

        logger.info(`[My Posts] ✓ Added post ${postId} successfully`);

        return NextResponse.json({
            success: true,
            message: "Post added successfully",
            post: importedPosts[importedPosts.length - 1],
        });
    } catch (error) {
        console.error("[My Posts] Error adding post:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to add post" },
            { status: 500 }
        );
    }
}
