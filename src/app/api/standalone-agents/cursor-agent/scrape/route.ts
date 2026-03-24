import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

// Helper to try Scraping Dog
async function fetchWithScrapingDog(url: string, key: string, dynamic: boolean): Promise<string | null> {
    try {
        const scrapingDogUrl = `https://api.scrapingdog.com/scrape?api_key=${key}&url=${encodeURIComponent(url)}&dynamic=${dynamic}`;
        console.log(`Attempting Scraping Dog with dynamic=${dynamic}`);
        const response = await axios.get(scrapingDogUrl, {
            timeout: dynamic ? 60000 : 30000, // Longer timeout for dynamic
        });
        return response.data;
    } catch (error) {
        console.warn(`Scraping Dog (dynamic=${dynamic}) failed:`, error instanceof Error ? error.message : String(error));
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { options } = body;

        if (!options?.url || typeof options.url !== "string") {
            return NextResponse.json(
                { error: "URL is required in options" },
                {
                    status: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    }
                }
            );
        }

        const url = options.url;

        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: "Invalid URL format" },
                {
                    status: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    }
                }
            );
        }

        let htmlContent: string | null = null;
        let scrapingMethod = "basic";

        // 1. Try Scraping Dog if API Key exists
        const scrapingDogKey = process.env.SCRAPING_DOG_API_KEY;

        if (scrapingDogKey) {
            // Priority: Dynamic=true (best quality) -> Dynamic=false (faster/fallback)
            htmlContent = await fetchWithScrapingDog(url, scrapingDogKey, true);
            if (htmlContent) {
                scrapingMethod = "scraping_dog_dynamic";
            } else {
                htmlContent = await fetchWithScrapingDog(url, scrapingDogKey, false);
                if (htmlContent) scrapingMethod = "scraping_dog_static";
            }
        } else {
            console.warn("SCRAPING_DOG_API_KEY is not set in environment variables.");
        }

        // 2. Fallback to Basic Axios Scraping
        if (!htmlContent) {
            console.log("Falling back to basic Axios scraping");
            try {
                const response = await axios.get(url, {
                    timeout: 10000,
                    headers: {
                        // Pretend to be a real browser
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Cache-Control": "no-cache",
                    },
                });
                htmlContent = response.data;
                scrapingMethod = "basic_fallback";
            } catch (error) {
                console.error("Basic scraping failed:", error instanceof Error ? error.message : String(error));
            }
        }

        // Check if we got any content
        if (!htmlContent) {
            return NextResponse.json(
                { error: "Failed to retrieve content from URL. All scraping methods failed." },
                {
                    status: 500,
                    headers: { "Access-Control-Allow-Origin": "*" }
                }
            );
        }

        const $ = cheerio.load(htmlContent);
        $("script, style, nav, footer, header, aside, iframe").remove();

        const title = $("title").text().trim() || "Untitled Page";

        // Improve text extraction by handling block elements
        // Replace block tags with newlines to preserve structure for better summarization
        $('br, div, p, h1, h2, h3, h4, h5, h6, li').after('\n');

        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        const textToSummarize = bodyText.slice(0, 25000); // Increased limit slightly

        if (!textToSummarize || textToSummarize.length < 50) {
            return NextResponse.json(
                { error: "No substantial text content found on the page" },
                {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                }
            );
        }

        // Stage 1: Content Analysis with Llama 3.3 (70B - Best for extraction)
        const analysisCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a precise content analyst. Extract ONLY factual information from webpage content.

Return a JSON object with this EXACT structure:
{
  "executive_summary": "A factual overview (3-4 sentences) based ONLY on what's in the content",
  "key_insights": ["Factual point 1", "Factual point 2", "Factual point 3", "Factual point 4", "Factual point 5"],
  "structured_data": {
    "key_entities": ["Person/Company names found in text"],
    "dates_mentioned": ["Dates found in text"],
    "contact_info": ["Email/Phone found in text"],
    "urls_mentioned": ["URLs found in text"]
  },
  "content_type": "e.g., News, Blog, Product, Documentation, Authentication, Landing Page"
}

Be FACTUAL. Do not infer or assume. Only extract what is explicitly stated.`,
                },
                {
                    role: "user",
                    content: `Analyze this content:\n\nTitle: ${title}\n\nContent:\n${textToSummarize}`,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.0,
            max_tokens: 1500,
            response_format: { type: "json_object" },
        });

        const analysisContent = analysisCompletion.choices[0]?.message?.content || "{}";
        let contentAnalysis;

        try {
            contentAnalysis = JSON.parse(analysisContent.replace(/```json\n?|\n?```/g, "").trim());
        } catch (e) {
            console.error("Stage 1 JSON parsing failed:", e);
            contentAnalysis = {
                executive_summary: "Failed to analyze content.",
                key_insights: [],
                structured_data: {},
                content_type: "Unknown"
            };
        }

        // Stage 2: Verification & Fraud Detection with Llama 3.1 (8B - Fast for verification)
        const verificationCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a cybersecurity expert. Analyze web content for credibility using OBJECTIVE criteria.

Return a JSON object with this EXACT structure:
{
  "trust_score": 0-100,
  "sentiment": "Positive/Neutral/Negative/Suspicious",
  "fraud_indicators": [
    "Indicator 1 (if any)",
    "Indicator 2 (if any)"
  ],
  "credibility_assessment": "Brief factual assessment",
  "red_flags": [
    "Red flag 1 (if any)",
    "Red flag 2 (if any)"
  ]
}

OBJECTIVE FRAUD INDICATORS:
- Fake authentication pages (phishing)
- Suspicious URLs or domains
- Grammatical errors typical of scams
- Urgency tactics ("Act now!", "Limited time!")
- Requests for sensitive information
- Lack of contact information
- Too-good-to-be-true claims
- Mimicking legitimate brands

TRUST SCORE RULES (be consistent):
- 85-100: Official sites, known brands, .edu/.gov domains
- 70-84: Professional sites with contact info and transparency
- 50-69: Personal sites, blogs with some credibility signals
- 30-49: Suspicious patterns or lack of transparency
- 0-29: Clear fraud indicators or phishing attempts

Base your score on OBJECTIVE factors only. Same URL should always get same score.`,
                },
                {
                    role: "user",
                    content: `Verify this content for fraud and credibility:\n\nURL: ${url}\nTitle: ${title}\nContent Type: ${contentAnalysis.content_type}\n\nContent Summary:\n${contentAnalysis.executive_summary}\n\nFull Text Sample:\n${textToSummarize.slice(0, 5000)}`,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.0,
            max_tokens: 800,
            response_format: { type: "json_object" },
        });

        const verificationContent = verificationCompletion.choices[0]?.message?.content || "{}";
        let verification;

        try {
            verification = JSON.parse(verificationContent.replace(/```json\n?|\n?```/g, "").trim());
        } catch (e) {
            console.error("Stage 2 JSON parsing failed:", e);
            verification = {
                trust_score: 50,
                sentiment: "Neutral",
                fraud_indicators: [],
                credibility_assessment: "Unable to verify.",
                red_flags: []
            };
        }

        // Combine both analyses
        const structuredResult = {
            executive_summary: contentAnalysis.executive_summary,
            key_insights: contentAnalysis.key_insights || [],
            structured_data: contentAnalysis.structured_data || {},
            sentiment: verification.sentiment || "Neutral",
            category: contentAnalysis.content_type || "General",
            trust_score: verification.trust_score || 50,
            fraud_indicators: verification.fraud_indicators || [],
            credibility_assessment: verification.credibility_assessment || "Not assessed",
            red_flags: verification.red_flags || []
        };

        return NextResponse.json(
            {
                success: true,
                result: {
                    title,
                    data: structuredResult,
                    url,
                    method: scrapingMethod
                },
                action: "scrape",
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
        console.error("Critical error in scrape API:", error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error during scraping" },
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
