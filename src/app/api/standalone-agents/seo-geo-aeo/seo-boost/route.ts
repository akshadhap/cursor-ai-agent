import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, page } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Starting SEO Boost for ${page.url}`);

        const prompt = `
        You are an elite SEO expert. I have crawled a page:
        URL: ${page.url}
        Title: ${page.title}
        Current Meta Desc: ${page.metaDescription}
        H1s: ${JSON.stringify(page.h1)}
        Images: ${JSON.stringify(page.images)}
        Internal Links: ${JSON.stringify(page.internalLinks)}
        
        Generate an SEO boost for this page. Return purely a JSON object matching this structure EXACTLY:
        {
          "optimizedTitle": "50-60 char perfect title",
          "optimizedMetaDescription": "120-160 char compelling and keyword-rich meta description",
          "optimizedH1": "The single best H1 for this page",
          "altTextSuggestions": [
            { "src": "image_url", "suggestedAlt": "Descriptive alt text" }
          ],
          "internalLinkSuggestions": [
            { "href": "link_url", "suggestedAnchor": "Better anchor text" }
          ]
        }
        
        Ensure you only return a valid JSON object. Do not include markdown blocks.
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
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API Error`);
        }

        const data = await response.json();
        
        let rawContent = data.choices[0].message.content.trim();
        // Remove markdown formatting if the model still wrapped it
        if (rawContent.startsWith("```json")) rawContent = rawContent.slice(7);
        if (rawContent.startsWith("```")) rawContent = rawContent.slice(3);
        if (rawContent.endsWith("```")) rawContent = rawContent.slice(0, -3);
        rawContent = rawContent.trim();

        const boostObj = JSON.parse(rawContent);
        
        boostObj.url = page.url;
        boostObj.generatedAt = new Date().toISOString();

        return NextResponse.json({ boost: boostObj });
    } catch (error: any) {
        logger.error("SEO Boost error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
