import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, page } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Starting FAQ Generation for ${page.url}`);

        const prompt = `
        You are an elite Answer Engine Optimization (AEO) expert. 
        Read the following web page content and generate 3-5 highly relevant, structured Q&A pairs that directly answer common questions a user might have after reading it.
        
        Page URL: ${page.url}
        Page Content: ${page.bodyText.slice(0, 3000)}
        
        Return a JSON object matching this exact structure:
        {
          "pageUrl": "${page.url}",
          "questions": [
            {
              "id": "q1",
              "question": "The question Text",
              "answer": "A clear, concise, factual answer. No fluff."
            }
          ],
          "faqSchemaFull": "A raw string containing the complete, valid FAQPage JSON-LD schema representing all these questions and answers."
        }
        
        Do not return markdown, just the raw JSON format.
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
        const resultObj = JSON.parse(data.choices[0].message.content);
        
        // Ensure valid string representation for schema
        if (typeof resultObj.faqSchemaFull !== 'string') {
            resultObj.faqSchemaFull = JSON.stringify(resultObj.faqSchemaFull, null, 2);
        }

        resultObj.generatedAt = new Date().toISOString();

        return NextResponse.json({ result: resultObj });
    } catch (error: any) {
        logger.error("FAQ generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
