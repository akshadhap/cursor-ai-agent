import { NextRequest, NextResponse } from "next/server";
import { summarizeText } from "@/lib/groq";
import { scrapeLinkedInProfile } from "@/lib/linkedin-scraper";

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

        // Specialized handling for LinkedIn
        if (validUrl.includes('linkedin.com/in/') || validUrl.includes('linkedin.com/company/')) {
            console.log(`🎯 LinkedIn URL detected, using specialized scraper: ${validUrl}`);
            const linkedinResult = await scrapeLinkedInProfile(validUrl);

            if (linkedinResult.success && linkedinResult.data) {
                const profile = linkedinResult.data;
                const summaryContent = `
                    Name: ${profile.fullName}
                    Headline: ${profile.headline}
                    Location: ${profile.location}
                    Summary: ${profile.summary}
                    Experience: ${JSON.stringify(profile.experience)}
                    Education: ${JSON.stringify(profile.education)}
                    Skills: ${profile.skills?.join(', ')}
                `;

                // Still use Groq to summarize the structured data nicely
                let summary = "";
                try {
                    summary = await summarizeText(summaryContent);
                } catch (groqError) {
                    console.error("Groq summarization failed:", groqError);
                    summary = profile.summary || "Summary generation failed.";
                }

                return NextResponse.json({
                    success: true,
                    result: {
                        url: validUrl,
                        title: `${profile.fullName} - ${profile.headline}`,
                        summary,
                        preview: profile.summary?.substring(0, 500) + "...",
                        contentLength: summaryContent.length,
                        scrapedAt: new Date().toISOString(),
                        isLinkedIn: true,
                        profileData: profile
                    },
                    action: "scrape",
                });
            }
            console.log('⚠️ Specialized LinkedIn scraper failed, falling back to standard scrape...');
        }

        try {
            // Use Scraping Dog for all other URLs (or as fallback)
            console.log(`Scraping URL with Scraping Dog: ${validUrl}`);

            const scrapingDogUrl = `https://api.scrapingdog.com/scrape?api_key=${scrapingDogApiKey}&url=${encodeURIComponent(validUrl)}&dynamic=true`;

            const response = await fetch(scrapingDogUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html',
                }
            });

            if (!response.ok) {
                throw new Error(`Scraping failed: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();  // Extract title
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
                    suggestion: "The URL might be blocked or invalid."
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
