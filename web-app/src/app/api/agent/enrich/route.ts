import { NextRequest, NextResponse } from "next/server";
import { enrichData } from "@/lib/groq";

/**
 * POST /api/agent/enrich
 * Enriches data using SERP API for web search and Groq for processing
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, query } = body;

        // Validate input
        if (!text && !query) {
            return NextResponse.json(
                { error: "Text or search query is required" },
                { status: 400 }
            );
        }

        // Validate API key
        const serpApiKey = process.env.SERP_API_KEY;
        if (!serpApiKey) {
            return NextResponse.json(
                { error: "SERP API key not configured" },
                { status: 500 }
            );
        }

        const searchQuery = query || text;

        try {
            // Use SERP API to search for information
            const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=5`;

            const response = await fetch(serpUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`SERP API returned ${response.status}: ${response.statusText}`);
            }

            const serpData = await response.json();

            // Extract organic results
            const organicResults = serpData.organic_results || [];
            const knowledgeGraph = serpData.knowledge_graph || null;

            // Compile enrichment data from SERP results
            let enrichmentText = `Search results for: ${searchQuery}\n\n`;

            if (knowledgeGraph) {
                enrichmentText += `Knowledge Graph:\n`;
                enrichmentText += `Title: ${knowledgeGraph.title || 'N/A'}\n`;
                enrichmentText += `Type: ${knowledgeGraph.type || 'N/A'}\n`;
                enrichmentText += `Description: ${knowledgeGraph.description || 'N/A'}\n\n`;
            }

            organicResults.slice(0, 5).forEach((result: any, index: number) => {
                enrichmentText += `Result ${index + 1}:\n`;
                enrichmentText += `Title: ${result.title || 'N/A'}\n`;
                enrichmentText += `Link: ${result.link || 'N/A'}\n`;
                enrichmentText += `Snippet: ${result.snippet || 'N/A'}\n\n`;
            });

            // Use Groq to process and structure the enrichment data
            let structuredData;
            try {
                structuredData = await enrichData(enrichmentText);
            } catch (groqError) {
                console.error("Groq enrichment failed:", groqError);
                // Fallback to basic structure
                structuredData = {
                    name: knowledgeGraph?.title || "Unknown",
                    role: knowledgeGraph?.type || "Unknown",
                    company: "N/A",
                    keyPoints: organicResults.slice(0, 3).map((r: any) => r.snippet || ""),
                    sources: organicResults.slice(0, 5).map((r: any) => ({
                        title: r.title,
                        link: r.link,
                        snippet: r.snippet
                    }))
                };
            }

            return NextResponse.json({
                success: true,
                result: {
                    ...structuredData,
                    searchQuery,
                    knowledgeGraph,
                    sources: organicResults.slice(0, 5).map((r: any) => ({
                        title: r.title,
                        link: r.link,
                        snippet: r.snippet
                    })),
                    enrichedAt: new Date().toISOString()
                },
                action: "enrich",
            });
        } catch (fetchError: any) {
            console.error("SERP API error:", fetchError);
            return NextResponse.json(
                {
                    error: "Failed to fetch enrichment data",
                    details: fetchError.message || "Unknown error",
                    suggestion: "The API limit may be reached or the query is invalid."
                },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error("Enrichment route error:", error);
        return NextResponse.json(
            {
                error: "Failed to process enrichment request",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
