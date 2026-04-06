import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - AI Analysis API Route (Enhanced with Web Scraping)
 * Uses Firecrawl to scrape URLs, then Groq API for deep content strategy analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

interface CompanyProfile {
    businessName: string;
    industry: string;
    description: string;
    companySize: string;
    productsServices: string[];
    targetAudience: string;
    contentTone: string;
    linkedInUrl: string;
    websiteUrl: string;
    additionalLinks: string[];
}

interface ScrapedContent {
    linkedIn?: { content: string; title: string; description: string };
    website?: { content: string; title: string; description: string };
    additional?: { url: string; content: string }[];
}

interface AnalysisResult {
    companyType: string;
    categories: string[];
    audienceType: string;
    recommendedPostTypes: string[];
    contentThemes: string[];
    strategyScore: number;
    contentMix: Record<string, number>;
    keyInsights: {
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
        type: "positive" | "warning" | "improvement";
    }[];
    optimalPostingTimes: {
        day: string;
        timeRange: string;
        timezone: string;
    }[];
    audienceInsights: string;
    actionItems: string[];
    trends: {
        topic: string;
        relevance: number;
        description: string;
    }[];
    scrapedData?: {
        linkedInAnalyzed: boolean;
        websiteAnalyzed: boolean;
        additionalUrlsAnalyzed: number;
    };
    generatedAt: string;
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
        const { companyProfile, agentId } = body;

        if (!companyProfile || !agentId) {
            return NextResponse.json(
                { error: "Missing companyProfile or agentId" },
                { status: 400 }
            );
        }

        // Verify agent ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        logger.info(`[LinkedIn Analysis] Starting deep analysis for: ${companyProfile.businessName}`);

        // Get Unipile config for LinkedIn scraping
        const agentConfig = (agent.config as Record<string, unknown>) || {};
        const unipileAccountId = agentConfig.unipileAccountId as string | undefined;

        // Step 1: Scrape URLs if available (use Unipile for LinkedIn if connected)
        const scrapedContent = await scrapeUrls(companyProfile, unipileAccountId);

        // Step 2: Call Groq API with scraped content
        const analysis = await generateDeepAnalysis(companyProfile, scrapedContent);

        // Save analysis to agent data
        const updatedData = {
            ...(agent.data as object || {}),
            analysisResult: analysis,
            scrapedContent, // Save scraped content for reference
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify(updatedData)),
            },
        });

        logger.info(`[LinkedIn Analysis] Complete. Score: ${analysis.strategyScore}`);

        return NextResponse.json({ success: true, analysis });
    } catch (error) {
        console.error("[LinkedIn Analysis] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Analysis failed" },
            { status: 500 }
        );
    }
}

async function scrapeUrls(profile: CompanyProfile, unipileAccountId?: string): Promise<ScrapedContent> {
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const result: ScrapedContent = {};

    // Helper to scrape via Firecrawl
    const scrapeWithFirecrawl = async (url: string): Promise<{ content: string; title: string; description: string } | null> => {
        if (!firecrawlKey) {
            console.warn("[Scrape] No FIRECRAWL_API_KEY, skipping");
            return null;
        }

        try {
            logger.info(`[Scrape] Firecrawl scraping: ${url}`);

            const response = await fetch(FIRECRAWL_API_URL, {
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

            if (!response.ok) {
                console.error(`[Scrape] Firecrawl error for ${url}: ${response.status}`);
                return null;
            }

            const data = await response.json();

            if (!data.success) {
                console.error(`[Scrape] Firecrawl failed for ${url}: ${data.error}`);
                return null;
            }

            const content = data.data?.markdown || data.data?.content || "";
            const metadata = data.data?.metadata || {};

            logger.info(`[Scrape] Firecrawl success: ${url} (${content.length} chars)`);

            return {
                content: content.slice(0, 8000),
                title: metadata.title || "",
                description: metadata.description || "",
            };
        } catch (error) {
            console.error(`[Scrape] Firecrawl error for ${url}:`, error);
            return null;
        }
    };

    // Helper to fetch LinkedIn profile via Unipile
    const fetchLinkedInViaUnipile = async (): Promise<{ content: string; title: string; description: string } | null> => {
        if (!unipileAccountId) {
            logger.info("[Scrape] No Unipile account connected, skipping LinkedIn profile fetch");
            return null;
        }

        try {
            const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
            const baseUrl = `https://${dsn}/api/v1`;

            logger.info("[Scrape] Fetching LinkedIn profile via Unipile...");

            // First, get the user's own profile
            const response = await fetch(`${baseUrl}/users/me?account_id=${unipileAccountId}`, {
                headers: {
                    "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                },
            });

            if (!response.ok) {
                console.error(`[Scrape] Unipile profile fetch error: ${response.status}`);

                // Try alternate endpoint - get account info
                const accountResponse = await fetch(`${baseUrl}/accounts/${unipileAccountId}`, {
                    headers: {
                        "X-API-KEY": process.env.UNIPILE_API_KEY || "",
                    },
                });

                if (!accountResponse.ok) {
                    console.error(`[Scrape] Unipile account fetch also failed: ${accountResponse.status}`);
                    return null;
                }

                const accountData = await accountResponse.json();
                logger.info("[Scrape] Got account data from Unipile");

                // Extract profile info from account
                const profileContent = [
                    `Name: ${accountData.name || accountData.display_name || ""}`,
                    `Headline: ${accountData.headline || accountData.occupation || ""}`,
                    `Summary: ${accountData.summary || accountData.about || ""}`,
                    `Industry: ${accountData.industry || ""}`,
                    `Location: ${accountData.location || ""}`,
                    `Connections: ${accountData.connections_count || accountData.network_size || ""}`,
                ].filter(line => line.split(": ")[1]).join("\n");

                return {
                    content: profileContent || "LinkedIn profile connected via Unipile",
                    title: accountData.name || accountData.display_name || "LinkedIn Profile",
                    description: accountData.headline || accountData.occupation || "",
                };
            }

            const profileData = await response.json();
            logger.info("[Scrape] Got profile data from Unipile");

            // Build content from profile data
            const contentParts: string[] = [];

            if (profileData.name || profileData.display_name) {
                contentParts.push(`Name: ${profileData.name || profileData.display_name}`);
            }
            if (profileData.headline || profileData.occupation) {
                contentParts.push(`Headline: ${profileData.headline || profileData.occupation}`);
            }
            if (profileData.summary || profileData.about) {
                contentParts.push(`About: ${profileData.summary || profileData.about}`);
            }
            if (profileData.industry) {
                contentParts.push(`Industry: ${profileData.industry}`);
            }
            if (profileData.location) {
                contentParts.push(`Location: ${profileData.location}`);
            }
            if (profileData.experience && Array.isArray(profileData.experience)) {
                const expText = profileData.experience.slice(0, 3).map((exp: Record<string, string>) =>
                    `- ${exp.title || ""} at ${exp.company || ""}`
                ).join("\n");
                if (expText) contentParts.push(`Experience:\n${expText}`);
            }
            if (profileData.education && Array.isArray(profileData.education)) {
                const eduText = profileData.education.slice(0, 2).map((edu: Record<string, string>) =>
                    `- ${edu.degree || ""} at ${edu.school || ""}`
                ).join("\n");
                if (eduText) contentParts.push(`Education:\n${eduText}`);
            }
            if (profileData.skills && Array.isArray(profileData.skills)) {
                contentParts.push(`Skills: ${profileData.skills.slice(0, 10).join(", ")}`);
            }

            const content = contentParts.join("\n\n");

            return {
                content: content || "LinkedIn profile connected",
                title: profileData.name || profileData.display_name || "LinkedIn Profile",
                description: profileData.headline || profileData.occupation || "",
            };
        } catch (error) {
            console.error("[Scrape] Unipile profile fetch error:", error);
            return null;
        }
    };

    // Scrape LinkedIn - prefer Unipile if connected
    if (profile.linkedInUrl || unipileAccountId) {
        // Try Unipile first (works with login)
        const unipileData = await fetchLinkedInViaUnipile();
        if (unipileData) {
            result.linkedIn = unipileData;
            logger.info("[Scrape] LinkedIn data fetched via Unipile ✓");
        } else if (profile.linkedInUrl) {
            // Fall back to Firecrawl (probably won't work for LinkedIn)
            logger.info("[Scrape] Trying Firecrawl for LinkedIn (may fail due to login wall)...");
            const firecrawlData = await scrapeWithFirecrawl(profile.linkedInUrl);
            if (firecrawlData) {
                result.linkedIn = firecrawlData;
            }
        }
    }

    // Scrape Website (use Firecrawl - works fine for public websites)
    if (profile.websiteUrl) {
        const websiteData = await scrapeWithFirecrawl(profile.websiteUrl);
        if (websiteData) {
            result.website = websiteData;
        }
    }

    // Scrape additional links (limit to first 2)
    if (profile.additionalLinks && profile.additionalLinks.length > 0) {
        result.additional = [];
        for (const url of profile.additionalLinks.slice(0, 2)) {
            const data = await scrapeWithFirecrawl(url);
            if (data) {
                result.additional.push({ url, content: data.content });
            }
        }
    }

    return result;
}

async function generateDeepAnalysis(
    profile: CompanyProfile,
    scraped: ScrapedContent
): Promise<AnalysisResult> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.warn("[LinkedIn Analysis] No GROQ_API_KEY, using fallback");
        return generateFallbackAnalysis(profile, scraped);
    }

    // Build enhanced context from scraped content
    let scrapedContext = "";

    if (scraped.linkedIn) {
        scrapedContext += `\n\n=== LINKEDIN PAGE CONTENT ===\nTitle: ${scraped.linkedIn.title}\nDescription: ${scraped.linkedIn.description}\n\nPage Content:\n${scraped.linkedIn.content.slice(0, 3000)}`;
    }

    if (scraped.website) {
        scrapedContext += `\n\n=== WEBSITE CONTENT ===\nTitle: ${scraped.website.title}\nDescription: ${scraped.website.description}\n\nPage Content:\n${scraped.website.content.slice(0, 3000)}`;
    }

    if (scraped.additional && scraped.additional.length > 0) {
        scrapedContext += `\n\n=== ADDITIONAL PAGES ===`;
        for (const page of scraped.additional) {
            scrapedContext += `\n\nURL: ${page.url}\nContent:\n${page.content.slice(0, 1500)}`;
        }
    }

    const hasScrapedContent = !!scraped.linkedIn || !!scraped.website;

    const systemPrompt = `You are an expert LinkedIn content strategist and marketing analyst.
${hasScrapedContent ? "You have been provided with ACTUAL SCRAPED CONTENT from the company's LinkedIn page and/or website. Use this real data to provide DEEP, DATA-DRIVEN INSIGHTS." : "Analyze the company profile provided."}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the JSON object.

The JSON must have this exact structure:
{
  "companyType": "string - specific type of company based on actual content",
  "categories": ["array of 3-5 relevant industry categories based on real analysis"],
  "audienceType": "string - primary audience description based on messaging",
  "recommendedPostTypes": ["educational", "thought-leadership", "case-study", "engagement", "promotional", "behind-the-scenes", "news-commentary"],
  "contentThemes": ["array of 4-6 SPECIFIC content themes extracted from actual website/LinkedIn content"],
  "strategyScore": number between 50-95,
  "contentMix": {
    "educational": percentage,
    "promotional": percentage,
    "thought-leadership": percentage,
    "case-study": percentage,
    "behind-the-scenes": percentage,
    "engagement": percentage,
    "news-commentary": percentage
  },
  "keyInsights": [
    {
      "title": "string - specific insight based on real content analysis",
      "description": "string - detailed explanation with examples from scraped content",
      "severity": "high" | "medium" | "low",
      "type": "positive" | "warning" | "improvement"
    }
  ],
  "optimalPostingTimes": [
    { "day": "weekday", "timeRange": "time range", "timezone": "EST" }
  ],
  "audienceInsights": "string - detailed audience behavior description based on content analysis",
  "actionItems": ["array of 5-7 SPECIFIC, ACTIONABLE items based on what you observed in the content"],
  "trends": [
    { "topic": "string - relevant to their industry", "relevance": number 60-99, "description": "string" }
  ]
}

${hasScrapedContent ? `
IMPORTANT ANALYSIS GUIDELINES:
1. Strategy score should reflect ACTUAL presence quality (messaging clarity, value proposition, professionalism)
2. Key insights should reference SPECIFIC things you found in the scraped content
3. Content themes should be extracted from REAL topics on their website/LinkedIn
4. Action items should address SPECIFIC gaps or opportunities you identified
5. Be constructive but honest about areas for improvement
` : ""}

Ensure:
- All insights are specific and actionable
- contentMix percentages add up to 100
- keyInsights should have 4-6 items with mix of types
- optimalPostingTimes should have 3 entries
- trends should be 3 current industry-specific trends`;

    const userPrompt = `Analyze this company for LinkedIn content strategy:

Company Name: ${profile.businessName}
Industry: ${profile.industry}
Company Size: ${profile.companySize}
Description: ${profile.description || "Not provided"}
Products/Services: ${profile.productsServices?.join(", ") || "Not specified"}
Target Audience: ${profile.targetAudience || "Not specified"}
Content Tone: ${profile.contentTone}
LinkedIn URL: ${profile.linkedInUrl || "Not provided"}
Website: ${profile.websiteUrl || "Not provided"}
${scrapedContext}

Generate a comprehensive, data-driven LinkedIn content strategy analysis.`;

    try {
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
                temperature: 0.7,
                max_tokens: 3000,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[LinkedIn Analysis] Groq error (${response.status}):`, errorText);
            return generateFallbackAnalysis(profile, scraped);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            console.error("[LinkedIn Analysis] Empty response from Groq");
            return generateFallbackAnalysis(profile, scraped);
        }

        const analysis = JSON.parse(content);

        // Add metadata
        analysis.scrapedData = {
            linkedInAnalyzed: !!scraped.linkedIn,
            websiteAnalyzed: !!scraped.website,
            additionalUrlsAnalyzed: scraped.additional?.length || 0,
        };
        analysis.generatedAt = new Date().toISOString();

        return analysis as AnalysisResult;
    } catch (error) {
        console.error("[LinkedIn Analysis] Error calling Groq:", error);
        return generateFallbackAnalysis(profile, scraped);
    }
}

function generateFallbackAnalysis(profile: CompanyProfile, scraped: ScrapedContent): AnalysisResult {
    let score = 50;
    if (profile.linkedInUrl) score += 10;
    if (profile.websiteUrl) score += 10;
    if (profile.description && profile.description.length > 50) score += 10;
    if (profile.productsServices && profile.productsServices.length > 0) score += 5;
    if (profile.targetAudience) score += 5;
    if (scraped.linkedIn) score += 5;
    if (scraped.website) score += 5;

    return {
        companyType: `${profile.industry} Service Provider`,
        categories: [profile.industry, "B2B", "Professional Services"],
        audienceType: profile.targetAudience || "Business professionals",
        recommendedPostTypes: ["educational", "thought-leadership", "case-study"],
        contentThemes: [
            `${profile.industry} trends and insights`,
            "Client success stories",
            "Industry best practices",
            "Team and company updates",
        ],
        strategyScore: Math.min(score, 95),
        contentMix: {
            educational: 30,
            promotional: 15,
            "thought-leadership": 25,
            "case-study": 15,
            "behind-the-scenes": 5,
            engagement: 5,
            "news-commentary": 5,
        },
        keyInsights: [
            {
                title: scraped.website ? "Website Content Analyzed" : "Profile Analysis Started",
                description: scraped.website
                    ? `We analyzed your website content and found key themes around ${scraped.website.title || profile.industry}.`
                    : `${profile.businessName} is positioned in the ${profile.industry} space.`,
                severity: "medium",
                type: "positive",
            },
            {
                title: scraped.linkedIn ? "LinkedIn Presence Analyzed" : "LinkedIn Presence",
                description: scraped.linkedIn
                    ? `Your LinkedIn page shows: ${scraped.linkedIn.description?.slice(0, 100) || "Company presence established"}`
                    : profile.linkedInUrl
                        ? "LinkedIn profile connected - ready for optimization"
                        : "Add LinkedIn URL for deeper analysis",
                severity: scraped.linkedIn ? "low" : profile.linkedInUrl ? "low" : "high",
                type: scraped.linkedIn || profile.linkedInUrl ? "positive" : "warning",
            },
            {
                title: "Content Strategy Opportunity",
                description: "Consider diversifying content types to increase engagement and reach.",
                severity: "medium",
                type: "improvement",
            },
        ],
        optimalPostingTimes: [
            { day: "Tuesday", timeRange: "9:00 - 10:00 AM", timezone: "EST" },
            { day: "Wednesday", timeRange: "11:00 AM - 12:00 PM", timezone: "EST" },
            { day: "Thursday", timeRange: "2:00 - 3:00 PM", timezone: "EST" },
        ],
        audienceInsights: `Your target audience of ${profile.targetAudience || "business professionals"} is typically most active during business hours. Focus on providing value through educational content and industry insights.`,
        actionItems: [
            "Optimize your LinkedIn company page with keywords",
            "Create a content calendar with 2-3 posts per week",
            "Develop case studies showcasing client success",
            "Engage with industry thought leaders",
            "Use relevant hashtags consistently",
        ],
        trends: [
            { topic: "AI & Automation", relevance: 92, description: "AI adoption accelerating across industries" },
            { topic: "Content Marketing", relevance: 85, description: "Video and carousel posts driving engagement" },
            { topic: "Personal Branding", relevance: 78, description: "Founder-led content outperforming company pages" },
        ],
        scrapedData: {
            linkedInAnalyzed: !!scraped.linkedIn,
            websiteAnalyzed: !!scraped.website,
            additionalUrlsAnalyzed: scraped.additional?.length || 0,
        },
        generatedAt: new Date().toISOString(),
    };
}
