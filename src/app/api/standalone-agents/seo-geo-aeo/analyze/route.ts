import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, profile, crawledPages, serpKeywords } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Starting Groq Analysis for ${profile.domain}`);

        // Prepare context
        const context = JSON.stringify({
            domain: profile.domain,
            industry: profile.industry,
            focusGoal: profile.focusGoal,
            competitors: profile.competitors,
            pages: crawledPages.map((p: any) => ({
                url: p.url,
                title: p.title,
                metaDesc: p.metaDescription,
                h1: p.h1,
                wordCount: p.wordCount,
                imageCount: p.images?.length,
                missingAlt: p.images?.filter((i: any) => !i.alt).length
            })),
            serp: serpKeywords
        }).substring(0, 10000); // Prevent context limit explosion

        const prompt = `
        You are an expert SEO, GEO, and AEO consultant. Analyze the following website data:
        ${context}

        Return a FULL JSON representation of a VisibilityAnalysis object matching this structure EXACTLY. No markdown formatting, just pure JSON:
        {
          "visibilityScore": 65,
          "seoScore": 70,
          "geoScore": 60,
          "aeoScore": 65,
          "seoIssues": [
            { "id": "issue-1", "url": "home", "type": "missing-meta", "title": "Missing Meta Description", "description": "Desc is missing", "severity": "critical", "fix": "Add a meta description" }
          ],
          "geoAnalysis": {
            "entityClarityScore": 50,
            "knowledgePanelReadiness": 40,
            "aiMentionScore": 30,
            "entityStrengths": ["Good name"],
            "entityGaps": ["No wikipedia page"],
            "aiPresenceCheck": [],
            "structuredDataGaps": ["No organization schema"],
            "recommendations": ["Do this", "Do that"]
          },
          "quickWins": ["Fix H1 tags", "Add alt text"],
          "pagesAnalyzed": 1,
          "issuesFound": 1,
          "aeoResults": [],
          "contentBriefs": [],
          "schemaBlocks": [],
          "seoBoosts": [],
          "geoBoost": null,
          "generatedAt": "now"
        }
        
        Tailor the issues and recommendations specifically to the domain, industry, and missing data (like missing alt tags, meta descriptions, etc). Be highly analytical.
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }

        const data = await response.json();
        const analysisText = data.choices[0].message.content;

        let analysisObj;
        try {
            analysisObj = JSON.parse(analysisText);
            // Ensure necessary fields
            analysisObj.serpKeywords = serpKeywords || [];
            analysisObj.crawledPages = crawledPages || [];
            analysisObj.generatedAt = new Date().toISOString();
        } catch (parseError) {
            logger.error("Failed to parse Groq response:", analysisText);
            throw new Error("Invalid JSON from LLM");
        }

        return NextResponse.json({ analysis: analysisObj });
    } catch (error: any) {
        logger.error("Analyze API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
