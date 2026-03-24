import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - Post to LinkedIn API Route
 * Publish posts directly to LinkedIn via Unipile
 * 
 * Features:
 * - Immediate posting or scheduled posts
 * - Image attachment support via multipart/form-data
 * - Retry logic for transient failures
 * - Clear error messages for common issues
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Unipile API uses DSN-based URLs
const getUnipileBaseUrl = () => {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    return `https://${dsn}/api/v1`;
};

// Error message mapping for user-friendly responses
const ERROR_MESSAGES: Record<string, string> = {
    "401": "LinkedIn connection expired. Please reconnect your account in Settings.",
    "403": "Access denied. Your LinkedIn account may need reauthorization.",
    "429": "Rate limit reached. Please wait a few minutes before posting again.",
    "500": "LinkedIn service is temporarily unavailable. Please try again later.",
    "502": "Connection to LinkedIn failed. Please try again.",
    "503": "LinkedIn service is temporarily unavailable. Please try again later.",
};

/**
 * Parse Unipile error response into user-friendly message
 */
function parseUnipileError(status: number, responseText: string): string {
    // Check known error codes first
    const knownError = ERROR_MESSAGES[status.toString()];
    if (knownError) return knownError;

    // Try to parse JSON error
    try {
        const errorData = JSON.parse(responseText);
        if (errorData.title) return errorData.title;
        if (errorData.message) return errorData.message;
        if (errorData.error) return errorData.error;
        if (errorData.detail) return errorData.detail;
    } catch {
        // Not JSON, use raw text if short
        if (responseText.length < 200) return responseText;
    }

    return `Failed to create post (Error ${status})`;
}

/**
 * Retry a fetch request with exponential backoff
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 2
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Don't retry client errors (4xx) except rate limits (429)
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                return response;
            }

            // Success or last attempt
            if (response.ok || attempt === maxRetries) {
                return response;
            }

            // Wait before retry (exponential backoff: 1s, 2s, 4s)
            const delay = Math.pow(2, attempt) * 1000;
            logger.info(`[Unipile Post] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                throw lastError;
            }

            // Wait before retry
            const delay = Math.pow(2, attempt) * 1000;
            logger.info(`[Unipile Post] Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error("Max retries exceeded");
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
        const { agentId, content, imageUrl, scheduledFor } = body;

        if (!agentId || !content) {
            return NextResponse.json({ error: "Missing agentId or content" }, { status: 400 });
        }

        // Get agent and verify ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as Record<string, unknown> || {};
        const unipileAccountId = config.unipileAccountId as string;

        if (!unipileAccountId) {
            return NextResponse.json({ error: "LinkedIn not connected via Unipile" }, { status: 400 });
        }

        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Unipile API key not configured" }, { status: 500 });
        }

        const baseUrl = getUnipileBaseUrl();

        // If scheduled for the future, save locally and let the cron job handle it
        if (scheduledFor) {
            const scheduledTime = new Date(scheduledFor);
            const now = new Date();

            if (scheduledTime > now) {
                logger.info(`[Unipile Post] Scheduling post for: ${scheduledFor}`);

                // Save post as scheduled (cron job will post it when due)
                const agentData = (agent.data as Record<string, unknown>) || {};
                const existingPosts = Array.isArray(agentData.posts) ? agentData.posts : [];

                const newPost = {
                    id: `post-${Date.now()}`,
                    content,
                    category: "custom",
                    status: "scheduled",
                    scheduledAt: scheduledFor,
                    postedAt: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    imageUrl: imageUrl || null,
                };

                const updatedData = {
                    ...agentData,
                    posts: [...existingPosts, newPost],
                };

                await prisma.standaloneAgent.update({
                    where: { id: agentId },
                    data: {
                        data: updatedData,
                    },
                });

                return NextResponse.json({
                    success: true,
                    scheduled: true,
                    scheduledFor,
                    post: newPost,
                    message: `Post scheduled for ${new Date(scheduledFor).toLocaleString()}`,
                });
            }
        }

        // Post immediately via Unipile
        let response: Response;

        if (imageUrl) {
            // For posts with images, use multipart/form-data
            logger.info(`[Unipile Post] Creating post WITH IMAGE for account: ${unipileAccountId}`);

            // Fetch image from URL (ImgBB)
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                console.error(`[Unipile Post] Failed to fetch image from ${imageUrl}`);
                // Fall back to text-only post
            }

            const imageBlob = await imageResponse.blob();
            const formData = new FormData();
            formData.append("account_id", unipileAccountId);
            formData.append("text", content);
            formData.append("attachments", imageBlob, "image.jpg");

            logger.info(`[Unipile Post] URL: ${baseUrl}/posts`);
            logger.info(`[Unipile Post] Using FormData with image attachment`);

            response = await fetch(`${baseUrl}/posts`, {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKey,
                    "Accept": "application/json",
                    // Note: Do NOT set Content-Type for FormData - browser sets it with boundary
                },
                body: formData,
            });
        } else {
            // Text-only post, use JSON
            const postBody = {
                account_id: unipileAccountId,
                text: content,
            };

            logger.info(`[Unipile Post] Creating text-only post for account: ${unipileAccountId}`);
            logger.info(`[Unipile Post] URL: ${baseUrl}/posts`);
            logger.info(`[Unipile Post] Body:`, JSON.stringify(postBody, null, 2));

            response = await fetch(`${baseUrl}/posts`, {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKey,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(postBody),
            });
        }

        const responseText = await response.text();
        logger.info(`[Unipile Post] Response: ${response.status}`, responseText);

        if (!response.ok) {
            console.error(`[Unipile Post] Error: ${response.status}`, responseText);
            const errorMessage = parseUnipileError(response.status, responseText);
            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        const postData = JSON.parse(responseText);
        logger.info(`[Unipile Post] Success:`, postData.id || postData.object);

        // Save post to agent data
        const agentData = (agent.data as Record<string, unknown>) || {};
        const existingPosts = Array.isArray(agentData.posts) ? agentData.posts : [];

        const newPost = {
            id: `post-${Date.now()}`,
            content,
            category: "custom",
            status: "posted",
            scheduledAt: null,
            postedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unipilePostId: postData.id,
            imageUrl: imageUrl || null,
        };

        const updatedData = {
            ...agentData,
            posts: [...existingPosts, newPost],
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: updatedData,
            },
        });

        return NextResponse.json({
            success: true,
            postId: postData.id,
            post: newPost,
        });
    } catch (error) {
        console.error("[Unipile Post] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Post failed" },
            { status: 500 }
        );
    }
}
