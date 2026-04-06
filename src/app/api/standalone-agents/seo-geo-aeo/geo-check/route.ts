import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

// Standard GEO check uses OpenRouter if available, or falls back to Groq
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
    try {
        const { agentId, profile, currentAnalysis } = await req.json();

        // Ensure we have some key to run this
        const useGroq = !OPENROUTER_API_KEY && GROQ_API_KEY;

        if (!OPENROUTER_API_KEY && !GROQ_API_KEY) {
            return NextResponse.json({ error: "No API keys configured for GEO check" }, { status: 500 });
        }

        logger.info(`Starting Real AI Presence Check for ${profile.businessName}`);

        const endpoint = useGroq 
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "https://openrouter.ai/api/v1/chat/completions";

        const authKey = useGroq ? GROQ_API_KEY : OPENROUTER_API_KEY;
        const model = useGroq ? "llama-3.3-70b-versatile" : "google/gemini-2.5-pro:free"; // Typically good for general knowledge

        // Prepare 3 test questions to ask the AI pretending to be a typical user
        const questions = [
            `What is ${profile.businessName}?`,
            `What are the top companies in ${profile.industry}?`,
            `Who provides services like ${profile.description}?`
        ];

        let presenceChecks: { query: string; brandMentioned: boolean; snippet: string }[] = [];

        // In a full production app, you might want to run these in parallel.
        // For standard OpenRouter limits, doing them sequentially is safer.
        for (const query of questions) {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${authKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: `Please answer briefly: ${query}` }],
                        temperature: 0.2, // low temp for factual answers
                        max_tokens: 150
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const snippet = data.choices[0].message.content;
                    
                    // Simple logic to detect if the brand was mentioned
                    // More complex logic would use semantic matching
                    const brandMentioned = snippet.toLowerCase().includes(profile.businessName.toLowerCase());
                    
                    presenceChecks.push({
                        query,
                        brandMentioned,
                        snippet: snippet.substring(0, 200) + (snippet.length > 200 ? "..." : "")
                    });
                }
            } catch (err) {
                logger.warn(`Failed to ask question: ${query}`, err);
            }
        }

        // Calculate a new AI mention score based on real results
        let aiMentionScore = 0;
        if (presenceChecks.length > 0) {
            const mentions = presenceChecks.filter(c => c.brandMentioned).length;
            aiMentionScore = Math.floor((mentions / presenceChecks.length) * 100);
        }

        // Return updated analysis
        const existingGeo = currentAnalysis.geoAnalysis || {
            entityClarityScore: 0,
            knowledgePanelReadiness: 0,
            aiMentionScore: 0,
            entityStrengths: [],
            entityGaps: [],
            aiPresenceCheck: [],
            structuredDataGaps: [],
            recommendations: [],
            generatedAt: new Date().toISOString(),
        };

        const updatedAnalysis = {
            ...currentAnalysis,
            geoAnalysis: {
                ...existingGeo,
                aiMentionScore,
                aiPresenceCheck: presenceChecks,
                generatedAt: new Date().toISOString(),
            }
        };

        return NextResponse.json({ analysis: updatedAnalysis });
    } catch (error: any) {
        logger.error("GEO check error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
