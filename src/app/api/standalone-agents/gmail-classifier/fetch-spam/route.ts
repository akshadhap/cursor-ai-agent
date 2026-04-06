/**
 * Fetch Spam Emails API
 * Fetches emails from Gmail's SPAM folder for rescue analysis
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { fetchGmailEmails } from "@/lib/gmail/client";
import { refreshAccessToken } from "@/lib/gmail/oauth";

export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const count = parseInt(searchParams.get("count") || "30");

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        // Get agent config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentConfig = agent.config as any;
        let accessToken = agentConfig?.accessToken;

        if (!accessToken) {
            return NextResponse.json(
                { error: "Gmail not connected" },
                { status: 400 }
            );
        }

        console.log(`[Fetch Spam] Fetching ${count} spam emails`);

        // Fetch spam emails
        let spamEmails: any[] = [];
        try {
            const result = await fetchGmailEmails(accessToken, {
                maxResults: count,
                labelIds: ["SPAM"],
            });
            spamEmails = result.emails;
        } catch (error: any) {
            // Check if error is 401 (Unauthorized)
            if (error.code === 401 || (error.message && error.message.includes("401"))) {
                console.log("[Fetch Spam] Access token expired, attempting refresh...");
                const refreshToken = agentConfig?.refreshToken;

                if (!refreshToken) {
                    return NextResponse.json(
                        { error: "Token expired and no refresh token available" },
                        { status: 401 }
                    );
                }

                try {
                    const newTokens = await refreshAccessToken(refreshToken);
                    accessToken = newTokens.access_token;

                    // Update stored access token
                    await prisma.standaloneAgent.update({
                        where: { id: agentId },
                        data: {
                            config: {
                                ...agentConfig,
                                accessToken: newTokens.access_token,
                            },
                        },
                    });

                    // Retry with new token
                    const retryResult = await fetchGmailEmails(accessToken, {
                        maxResults: count,
                        labelIds: ["SPAM"],
                    });
                    spamEmails = retryResult.emails;
                } catch (refreshError) {
                    console.error("[Fetch Spam] Refresh failed:", refreshError);
                    return NextResponse.json(
                        { error: "Failed to refresh access token" },
                        { status: 401 }
                    );
                }
            } else {
                throw error;
            }
        }

        console.log(`[Fetch Spam] Found ${spamEmails.length} spam emails`);

        // Return emails for client-side analysis
        return NextResponse.json({
            emails: spamEmails.map(email => ({
                id: email.id,
                threadId: email.threadId,
                subject: email.subject,
                from: email.from,
                date: email.date,
                snippet: email.snippet,
                body: email.body?.substring(0, 500), // Limit body size
            })),
            total: spamEmails.length,
        });
    } catch (error) {
        console.error("[Fetch Spam] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
