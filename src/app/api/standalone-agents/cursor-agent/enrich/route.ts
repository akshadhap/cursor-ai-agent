import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import axios from "axios";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";
const MAX_LENGTH = 5000;

// Helper to search via SerpApi
async function fetchSerpResults(query: string): Promise<string> {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
        console.warn("SERP_API_KEY not found");
        return "";
    }

    try {
        console.log(`Searching SERP for: ${query}`);
        const response = await axios.get("https://serpapi.com/search.json", {
            params: {
                q: query,
                api_key: apiKey,
                engine: "google",
                num: 3, // Reduced for speed
            },
            timeout: 20000,
        });

        const data = response.data;
        let context = "";

        // Extract knowledge graph if available
        if (data.knowledge_graph) {
            context += `Knowledge Graph: ${JSON.stringify(data.knowledge_graph)}\n\n`;
        }

        // Extract organic results
        if (data.organic_results && Array.isArray(data.organic_results)) {
            const snippets = data.organic_results.map((r: any) =>
                `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`
            ).join("\n---\n");
            context += `Search Results:\n${snippets}`;
        }

        return context;
    } catch (error) {
        console.error("SERP API Error:", error instanceof Error ? error.message : String(error));
        return "";
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, options } = body; // options might contain url or other hints

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        if (text.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_LENGTH} characters` },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        // 1. Perform Multi-Source Search Enrichment
        // We will run parallel searches to gather diverse data points
        const queries = [
            `${text} linkedin current bio`,           // Professional focus
            `${text} contact email website`,          // Contact focus
            `${text} net worth about biography`       // General/Personal focus
        ];

        console.log(`[Enrich] Executing ${queries.length} parallel searches for: ${text}`);

        const searchResults = await Promise.all(
            queries.map(q => fetchSerpResults(q))
        );

        const combinedContext = searchResults.join("\n\n=== NEXT SEARCH SOURCE ===\n\n");

        // 2. AI Extraction & Synthesis
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an elite Data Enrichment Intelligence. Your goal is to build a high-fidelity profile of the person or company.

SOURCES OF TRUTH:
1. The provided "Search Results" (Ground truth).
2. Your own internal knowledge base (Llama 3 context) - use this to fill gaps for public figures/companies.

INSTRUCTIONS:
- Synthesize data from all sources.
- Cross-reference conflicting data (prioritize LinkedIn/official sources).
- If the input is a famous person, use your internal knowledge to provide a very rich bio and accurate details.
- Infer email patterns if specific emails aren't found but company domain is known (mark as inferred).

Return a JSON object with this EXACT structure:
{
  "name": "Full Name",
  "role": "Current Job Title",
  "company": "Current Company",
  "location": "City, Country",
  "website": "Personal or Company Website URL",
  "social_profiles": {
    "linkedin": "URL",
    "twitter": "URL",
    "github": "URL",
    "other": ["URL"]
  },
  "bio": "A rich, professional biography (3-5 sentences) summarizing career, key achievements, and current focus.",
  "keyPoints": [
    "Key insight 1 (Career highlight)",
    "Key insight 2 (Achievement)",
    "Key insight 3 (Recent news/activity)",
    "Key insight 4",
    "Key insight 5"
  ],
  "email": "Email address (or 'Not found')",
  "confidence_score": "High/Medium/Low based on data availability"
}
`,
                },
                {
                    role: "user",
                    content: `TARGET: ${text}\n\nSEARCH DATA COMPILATION:\n${combinedContext || "No search results available."}`,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";

        let result;
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
            const parsed = JSON.parse(cleanContent);

            result = {
                name: parsed.name || text,
                role: parsed.role || "Unknown",
                company: parsed.company || "Unknown",
                location: parsed.location || "Unknown",
                website: parsed.website || undefined,
                social_profiles: parsed.social_profiles || { linkedin: undefined, twitter: undefined, github: undefined, other: [] },
                bio: parsed.bio || "No biography available.",
                keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
                email: parsed.email || undefined,
                confidence_score: parsed.confidence_score || "Low"
            };

            // Backwards compatibility/normalization for flat linkedin field
            if (result.social_profiles.linkedin) {
                (result as any).linkedin = result.social_profiles.linkedin;
            }

        } catch (e) {
            console.error("JSON parsing failed:", e);
            result = {
                name: text,
                role: "Unknown",
                company: "Unknown",
                location: "Unknown",
                bio: "Failed to parse enrichment data",
                keyPoints: ["Error processing results"],
                social_profiles: {},
                confidence_score: "Low"
            };
        }

        return NextResponse.json(
            {
                success: true,
                result,
                action: "enrich",
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            }
        );
    } catch (error) {
        console.error("Error in enrich API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to enrich data" },
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                }
            }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        }
    );
}
