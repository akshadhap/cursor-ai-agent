import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, schemaType, page, websiteProfile } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Generating ${schemaType} Schema for ${websiteProfile.domain}`);

        const prompt = `
        You are an expert Schema.org JSON-LD generator. 
        Generate a strictly valid minified JSON-LD block for the schema type: "${schemaType}".
        
        Brand Information:
        Business Name: ${websiteProfile.businessName}
        Domain: ${websiteProfile.domain}
        Industry: ${websiteProfile.industry}
        Description: ${websiteProfile.description}

        ${page ? `Page URL: ${page.url}\nPage Title: ${page.title}\nPage Content: ${page.bodyText?.slice(0, 1000)}` : ""}
        
        Return ONLY a JSON object that contains exactly one key: "jsonLd" containing the raw JSON-LD markup.
        The value of "jsonLd" must be valid JSON-LD inside a <script type="application/ld+json"> tag concept, but only return the inner JSON part.

        Example output:
        {
          "jsonLd": "{ \\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Organization\\", \\"name\\": \\"Acme Corp\\" }"
        }
        
        Make sure the string inside "jsonLd" is correctly escaped JSON or a rich JSON structure.
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
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API Error`);
        }

        const data = await response.json();
        
        let rawContent = data.choices[0].message.content.trim();
        if (rawContent.startsWith("```json")) rawContent = rawContent.slice(7);
        if (rawContent.startsWith("```")) rawContent = rawContent.slice(3);
        if (rawContent.endsWith("```")) rawContent = rawContent.slice(0, -3);
        rawContent = rawContent.trim();

        const blockObj = JSON.parse(rawContent);
        
        let jsonLdContent = blockObj.jsonLd;
        // If the LLM returned an object instead of a stringified object inside jsonLd, we stringify it
        if (typeof jsonLdContent !== 'string') {
            jsonLdContent = JSON.stringify(jsonLdContent, null, 2);
        }

        const schemaBlock = {
            id: `schema-${Date.now()}`,
            type: schemaType,
            pageUrl: page?.url || websiteProfile.domain,
            jsonLd: jsonLdContent,
            generatedAt: new Date().toISOString()
        };

        return NextResponse.json({ block: schemaBlock });
    } catch (error: any) {
        logger.error("Schema generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
