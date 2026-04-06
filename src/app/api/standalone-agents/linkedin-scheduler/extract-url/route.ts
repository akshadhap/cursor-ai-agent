import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Extract from URL API Route
 * Scrape URL content and generate a LinkedIn post about it
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

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
        const { url, agentId } = body;

        if (!url || !agentId) {
            return NextResponse.json({ error: "Missing url or agentId" }, { status: 400 });
        }

        // Verify agent ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as Record<string, unknown> || {};
        const companyProfile = config.companyProfile as Record<string, string> || {};

        // Step 1: Scrape URL
        let scrapedContent = "";
        let pageTitle = "";

        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        if (firecrawlKey) {
            try {
                logger.info(`[Extract URL] Scraping: ${url}`);
                const scrapeResponse = await fetch(FIRECRAWL_API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${firecrawlKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        url,
                        formats: ["markdown"],
                        onlyMainContent: true,
                        waitFor: 3000,
                    }),
                });

                if (scrapeResponse.ok) {
                    const scrapeData = await scrapeResponse.json();
                    if (scrapeData.success) {
                        scrapedContent = scrapeData.data?.markdown || scrapeData.data?.content || "";
                        pageTitle = scrapeData.data?.metadata?.title || "";
                        logger.info(`[Extract URL] Success: ${scrapedContent.length} chars`);
                    }
                }
            } catch (error) {
                console.error("[Extract URL] Scrape error:", error);
            }
        }

        // Step 2: Generate post from content
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                content: `📢 Check out this interesting article!\n\n${url}\n\nWhat are your thoughts? 👇\n\n#ContentSharing #LinkedIn`,
            });
        }

        const systemPrompt = `You are an expert LinkedIn content writer for ${companyProfile.businessName || "a professional business"}.

Based on the URL content provided, write an engaging LinkedIn post that:
- Summarizes the key insights
- Adds your unique perspective
- Encourages discussion
- Includes the URL
- Has 3-5 relevant hashtags

Make it authentic and valuable to ${companyProfile.targetAudience || "professionals"}.
Keep under 3000 characters.
Return ONLY the post content.`;

        const userPrompt = scrapedContent
            ? `URL: ${url}\nPage Title: ${pageTitle}\n\nContent:\n${scrapedContent.slice(0, 4000)}\n\nWrite an engaging LinkedIn post about this.`
            : `URL: ${url}\n\nWrite an engaging LinkedIn post sharing this link.`;

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            console.error("[Extract URL] Groq error:", await response.text());
            return NextResponse.json({
                content: `📢 Check out this interesting article!\n\n${url}\n\nWhat are your thoughts? 👇\n\n#ContentSharing #LinkedIn`,
            });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";

        return NextResponse.json({ success: true, content });
    } catch (error) {
        console.error("[Extract URL] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Extraction failed" },
            { status: 500 }
        );
    }
}
