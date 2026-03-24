import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, keyword } = await req.json();

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Missing GROQ API KEY" }, { status: 500 });
        }

        logger.info(`Generating content brief for keyword: ${keyword}`);

        const prompt = `
        You are an elite SEO content strategist. Generate a comprehensive content brief to rank on Google for the target keyword: "${keyword}".
        
        Return a JSON object exactly matching this structure:
        {
          "keyword": "${keyword}",
          "searchVolume": "make an educated guess e.g. '1K - 10K'",
          "difficulty": "easy, medium, or hard",
          "intent": "informational, commercial, transactional, or navigational",
          "title": "A highly clickable, SEO-optimized H1 title",
          "outline": [
            "H2: Introduction",
            "H2: Main Point 1",
            "H3: Sub-point"
          ],
          "targetKeywords": ["LSI keyword 1", "semantic keyword 2", "related keyword 3"],
          "wordCountTarget": 1500,
          "suggestedFaqs": ["Question 1?", "Question 2?"]
        }
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
                temperature: 0.4
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API Error`);
        }

        const data = await response.json();
        const briefObj = JSON.parse(data.choices[0].message.content);
        
        briefObj.id = `brief-${Date.now()}`;
        briefObj.generatedAt = new Date().toISOString();

        return NextResponse.json({ brief: briefObj });
    } catch (error: any) {
        logger.error("Content brief generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
