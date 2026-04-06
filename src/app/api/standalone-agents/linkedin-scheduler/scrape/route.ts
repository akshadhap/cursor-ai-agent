import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Web Scraping API Route
 * Uses Firecrawl API to extract content from LinkedIn profiles and websites
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

interface ScrapeResult {
    url: string;
    success: boolean;
    content?: string;
    title?: string;
    description?: string;
    error?: string;
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
        const { urls } = body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "URLs array required" }, { status: 400 });
        }

        const apiKey = process.env.FIRECRAWL_API_KEY;

        if (!apiKey) {
            console.warn("[Scrape] No FIRECRAWL_API_KEY, returning empty results");
            return NextResponse.json({
                success: true,
                results: urls.map((url: string) => ({
                    url,
                    success: false,
                    error: "Firecrawl API key not configured",
                })),
            });
        }

        logger.info(`[Scrape] Starting scrape for ${urls.length} URL(s)`);

        // Scrape each URL
        const results: ScrapeResult[] = await Promise.all(
            urls.map(async (url: string): Promise<ScrapeResult> => {
                try {
                    logger.info(`[Scrape] Scraping: ${url}`);

                    const response = await fetch(FIRECRAWL_API_URL, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            url,
                            formats: ["markdown"],
                            onlyMainContent: true,
                            waitFor: 3000,
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Scrape] Firecrawl error for ${url}:`, errorText);
                        return {
                            url,
                            success: false,
                            error: `Firecrawl error: ${response.status}`,
                        };
                    }

                    const data = await response.json();

                    if (!data.success) {
                        return {
                            url,
                            success: false,
                            error: data.error || "Scrape failed",
                        };
                    }

                    const content = data.data?.markdown || data.data?.content || "";
                    const metadata = data.data?.metadata || {};

                    logger.info(`[Scrape] Success: ${url} (${content.length} chars)`);

                    return {
                        url,
                        success: true,
                        content: content.slice(0, 10000), // Limit content size
                        title: metadata.title || "",
                        description: metadata.description || "",
                    };
                } catch (error) {
                    console.error(`[Scrape] Error for ${url}:`, error);
                    return {
                        url,
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                    };
                }
            })
        );

        const successCount = results.filter((r) => r.success).length;
        logger.info(`[Scrape] Complete: ${successCount}/${urls.length} successful`);

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("[Scrape] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Scrape failed" },
            { status: 500 }
        );
    }
}
