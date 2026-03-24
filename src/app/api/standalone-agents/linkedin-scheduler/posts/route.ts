/**
 * LinkedIn Scheduler - Posts API
 * Fetch user's LinkedIn posts and manage post-specific automations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

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
    createdAt: string;
}

// GET - Fetch user's LinkedIn posts
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

        const config = (agent.config as Record<string, unknown>) || {};
        const accountId = config.unipileAccountId as string;

        if (!accountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
        const baseUrl = `https://${dsn}/api/v1`;

        // Get user's profile ID first
        let userId = "";
        try {
            const profileResponse = await fetch(
                `${baseUrl}/accounts/${accountId}`,
                { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
            );
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                userId = profileData.identifier || profileData.provider_id || profileData.id || "";
            }
        } catch (e) {
            console.error("[Posts API] Failed to get profile:", e);
        }

        // Try to fetch posts using different endpoints
        let posts: unknown[] = [];

        // Method 1: Try profile's posts endpoint
        if (userId) {
            try {
                const postsResponse = await fetch(
                    `${baseUrl}/users/${userId}/posts?account_id=${accountId}&limit=20`,
                    { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                );
                if (postsResponse.ok) {
                    const data = await postsResponse.json();
                    posts = data.items || data.posts || [];
                }
            } catch (e) {
                console.error("[Posts API] Method 1 failed:", e);
            }
        }

        // Method 2: Try /linkedin/profile/posts
        if (posts.length === 0) {
            try {
                const postsResponse = await fetch(
                    `${baseUrl}/linkedin/profile/posts?account_id=${accountId}&limit=20`,
                    { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                );
                if (postsResponse.ok) {
                    const data = await postsResponse.json();
                    posts = data.items || data.posts || [];
                }
            } catch (e) {
                console.error("[Posts API] Method 2 failed:", e);
            }
        }

        // Method 3: Try generic posts endpoint with filters
        if (posts.length === 0) {
            try {
                const postsResponse = await fetch(
                    `${baseUrl}/posts?account_id=${accountId}&author_type=SELF&limit=20`,
                    { headers: { "X-API-KEY": process.env.UNIPILE_API_KEY || "" } }
                );
                if (postsResponse.ok) {
                    const data = await postsResponse.json();
                    posts = data.items || data.posts || [];
                }
            } catch (e) {
                console.error("[Posts API] Method 3 failed:", e);
            }
        }

        // Get saved post automations
        const postAutomations = (config.postAutomations || []) as PostAutomation[];

        // Format response
        const formattedPosts = posts.map((post) => {
            const p = post as Record<string, unknown>;
            const postId = (p.id || p.social_id || p.provider_id) as string;
            const automation = postAutomations.find(a => a.postId === postId);

            return {
                id: postId,
                text: ((p.text || p.content || "") as string).slice(0, 200),
                url: p.url || p.share_url || "",
                createdAt: p.created_at || p.date || "",
                reactions: p.reactions_count || p.likes_count || 0,
                comments: p.comments_count || 0,
                automation: automation || null,
            };
        });

        return NextResponse.json({
            success: true,
            posts: formattedPosts,
            savedAutomations: postAutomations,
        });
    } catch (error) {
        console.error("[Posts API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch posts" },
            { status: 500 }
        );
    }
}

// POST - Save post automation (add post URL manually or set automation rules)
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
        const { agentId, postAutomation } = body;

        if (!agentId || !postAutomation) {
            return NextResponse.json({ error: "Missing agentId or postAutomation" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const postAutomations = (config.postAutomations || []) as PostAutomation[];

        // Extract post ID from URL if provided
        let postId = postAutomation.postId;
        if (!postId && postAutomation.postUrl) {
            // Try to extract post ID from LinkedIn URL
            const urlMatch = postAutomation.postUrl.match(/activity-(\d+)/);
            if (urlMatch) {
                postId = urlMatch[1];
            } else {
                // Try urn format
                const urnMatch = postAutomation.postUrl.match(/urn:li:activity:(\d+)/);
                if (urnMatch) {
                    postId = urnMatch[1];
                }
            }
        }

        if (!postId) {
            return NextResponse.json({ error: "Could not extract post ID from URL" }, { status: 400 });
        }

        // Check if automation exists
        const existingIndex = postAutomations.findIndex(a => a.postId === postId);

        const newAutomation: PostAutomation = {
            postId,
            postUrl: postAutomation.postUrl || "",
            postText: postAutomation.postText || "",
            keywords: postAutomation.keywords || [],
            publicReply: postAutomation.publicReply || "",
            dmMessage: postAutomation.dmMessage || "",
            attachmentUrl: postAutomation.attachmentUrl || "",
            enabled: postAutomation.enabled ?? true,
            triggeredCount: existingIndex >= 0 ? postAutomations[existingIndex].triggeredCount : 0,
            createdAt: existingIndex >= 0 ? postAutomations[existingIndex].createdAt : new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            postAutomations[existingIndex] = newAutomation;
        } else {
            postAutomations.push(newAutomation);
        }

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify({
                    ...config,
                    postAutomations,
                })),
            },
        });

        return NextResponse.json({
            success: true,
            postAutomation: newAutomation,
        });
    } catch (error) {
        console.error("[Posts API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to save automation" },
            { status: 500 }
        );
    }
}

// DELETE - Remove post automation
export async function DELETE(req: NextRequest) {
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
        const { agentId, postId } = body;

        if (!agentId || !postId) {
            return NextResponse.json({ error: "Missing agentId or postId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const postAutomations = (config.postAutomations || []) as PostAutomation[];

        const filtered = postAutomations.filter(a => a.postId !== postId);

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify({
                    ...config,
                    postAutomations: filtered,
                })),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Posts API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete automation" },
            { status: 500 }
        );
    }
}
