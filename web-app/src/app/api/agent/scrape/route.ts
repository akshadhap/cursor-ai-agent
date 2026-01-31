import { NextRequest, NextResponse } from "next/server";
import { summarizeText } from "@/lib/groq";

/**
 * POST /api/agent/scrape
 * Scrapes content from a URL using Scraping Dog API and processes with Groq
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text: url } = body; // 'text' acts as the URL input

        // Validate input
        if (!url || typeof url !== "string") {
            return NextResponse.json(
                { error: "URL is required" },
                { status: 400 }
            );
        }

        // Validate API key
        const scrapingDogApiKey = process.env.SCRAPING_DOG_API_KEY;
        if (!scrapingDogApiKey) {
            return NextResponse.json(
                { error: "Scraping Dog API key not configured" },
                { status: 500 }
            );
        }

        const validUrl = url.startsWith("http") ? url : `https://${url}`;

        // Check if it's a LinkedIn profile
        const isLinkedIn = validUrl.includes("linkedin.com/in/");

        try {
            let response;
            let responseHtmlOrJson;

            if (isLinkedIn) {
                // Use Scraping Dog's Dedicated LinkedIn API (standard endpoint)
                console.log("Detected LinkedIn URL, using specialized API...");

                // Ensure we have a clean URL without trailing slashes
                const cleanLinkedInUrl = validUrl.replace(/\/+$/, '');

                // USERS REQUEST: Use the dedicated LinkedIn API Key (Hardcoded for reliability)
                const linkedinApiKey = "697d95dec83e3674299b9613";

                console.log(`LinkedIn Scrape Debug: KeyPrefix=${linkedinApiKey.substring(0, 4)}, URL=${cleanLinkedInUrl}`);

                // Note: Scraping Dog often requires the URL to be exactly as they expect.
                // Trying the 'linkedinprofile' endpoint which is sometimes separate from 'linkedin?type=profile'
                // But standard docs say: https://api.scrapingdog.com/linkedin?api_key=XXX&type=profile&link=XXX

                // Re-adding encodeURIComponent is CRITICAL because the link contains special chars like ://
                const requestUrl = `https://api.scrapingdog.com/linkedin?api_key=${linkedinApiKey}&type=profile&link=${encodeURIComponent(cleanLinkedInUrl)}`;

                response = await fetch(requestUrl, { method: 'GET' });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`LinkedIn API Failed: Status=${response.status}, Body=${errorText}`);
                    // Ensure the error text is passed to the catch block
                    throw new Error(errorText || response.statusText);
                }

                // LinkedIn API returns JSON
                const linkedinData = await response.json();

                // Format LinkedIn data into standard result structure
                const fullName = linkedinData[0]?.fullName || "LinkedIn Profile";
                const headline = linkedinData[0]?.headline || "";
                const summary = linkedinData[0]?.summary || headline;
                const experience = linkedinData[0]?.experience?.map((exp: any) =>
                    `${exp.position} at ${exp.company} (${exp.dateRange})`
                ).join('. ') || "";

                // Combine for AI summary generation
                const fullText = `Profile: ${fullName}. Headline: ${headline}. About: ${summary}. Experience: ${experience}`;

                // Generate AI summary
                let aiSummary = "";
                try {
                    aiSummary = await summarizeText(fullText.substring(0, 5000));
                } catch (e) {
                    aiSummary = summary;
                }

                return NextResponse.json({
                    success: true,
                    result: {
                        url: validUrl,
                        title: `${fullName} - LinkedIn`,
                        summary: aiSummary,
                        preview: `Headline: ${headline}\nLocation: ${linkedinData[0]?.location || 'N/A'}`,
                        contentLength: JSON.stringify(linkedinData).length,
                        scrapedAt: new Date().toISOString(),
                        // Add raw data for potential future use
                        rawData: linkedinData[0]
                    },
                    action: "scrape",
                });
            }

            // Standard Scraping for non-LinkedIn sites
            const scrapingDogUrl = `https://api.scrapingdog.com/scrape?api_key=${scrapingDogApiKey}&url=${encodeURIComponent(validUrl)}&dynamic=false`;

            response = await fetch(scrapingDogUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Scraping Dog API returned ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const html = await response.text();

            // Extract title
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "No Title";

            // Clean and extract text content
            const cleanText = html
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            // Limit text length for processing
            const textToProcess = cleanText.substring(0, 5000);

            // Use Groq to generate a summary of the scraped content
            let summary = "";
            try {
                summary = await summarizeText(textToProcess);
            } catch (groqError) {
                console.error("Groq summarization failed:", groqError);
                summary = "Summary generation failed. Raw content available.";
            }

            return NextResponse.json({
                success: true,
                result: {
                    url: validUrl,
                    title,
                    summary,
                    preview: textToProcess.substring(0, 500) + "...",
                    contentLength: cleanText.length,
                    scrapedAt: new Date().toISOString()
                },
                action: "scrape",
            });

        } catch (fetchError: any) {
            console.error("Scraping error:", fetchError);
            return NextResponse.json(
                {
                    error: "Failed to scrape URL",
                    details: fetchError.message || "Unknown error",
                    suggestion: isLinkedIn ? "LinkedIn profiles require specific handling." : "The URL might be blocked or invalid."
                },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error("Scraping route error:", error);
        return NextResponse.json(
            {
                error: "Failed to process scraping request",
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
