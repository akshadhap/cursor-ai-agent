import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, websiteProfile } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Starting GEO Boost for ${websiteProfile.domain}`);

        const prompt = `
        You are an elite Generative Engine Optimization (GEO) expert. 
        I need to generate entity optimization content for this brand to feed AI models like Perplexity, ChatGPT, and Google SGE.
        
        Brand Details:
        Domain: ${websiteProfile.domain}
        Name: ${websiteProfile.businessName}
        Industry: ${websiteProfile.industry}
        Description: ${websiteProfile.description}

        Generate the following and return purely a JSON object matching this exact structure:
        {
          "entitySummary": "A highly dense, factual, Wikipedia-style summary paragraph defining exactly what this brand is and does. Use semantic triplets (subject, predicate, object).",
          "knowledgePanelContent": {
            "name": "${websiteProfile.businessName}",
            "description": "Short 1-2 sentence description",
            "foundedYear": "2024 or make an educated guess/leave blank if unknown",
            "headquarters": "City, Country or leave blank",
            "industry": "${websiteProfile.industry}",
            "website": "https://${websiteProfile.domain}"
          },
          "faqAnswers": [
            { "question": "What is ${websiteProfile.businessName}?", "answer": "Clear, factual answer." },
            { "question": "What services does ${websiteProfile.businessName} provide?", "answer": "Clear, factual answer." },
            { "question": "Who founded ${websiteProfile.businessName}?", "answer": "Clear, factual answer." }
          ],
          "suggestedCitations": [
            "List 3-5 high authority websites or directories where this brand MUST be listed to establish entity trust (e.g. Crunchbase, G2, Trustpilot, industry-specific sites)"
          ],
          "jsonLd": "Generate a valid, minified Organization JSON-LD script block containing all these details."
        }
        
        Do not include markdown tags (\`\`\`json) returning. Just the raw JSON object.
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
            throw new Error(`Groq API Error`);
        }

        const data = await response.json();
        const boostObj = JSON.parse(data.choices[0].message.content);
        
        // Ensure jsonLd is a string correctly formatted
        if (typeof boostObj.jsonLd !== 'string') {
            boostObj.jsonLd = JSON.stringify(boostObj.jsonLd, null, 2);
        }

        boostObj.generatedAt = new Date().toISOString();

        return NextResponse.json({ boost: boostObj });
    } catch (error: any) {
        logger.error("GEO Boost error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
