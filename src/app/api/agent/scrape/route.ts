import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { summarizeText } from "@/features/standalone-agents/agents/cursor-agent/lib/groq";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { options } = body;

        // Validation
        if (!options?.url || typeof options.url !== "string") {
            return NextResponse.json(
                { error: "URL is required in options" },
                { status: 400 }
            );
        }

        const url = options.url;

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: "Invalid URL format" },
                { status: 400 }
            );
        }

        // Fetch the webpage
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        // Parse HTML with Cheerio
        const $ = cheerio.load(response.data);

        // Remove script and style tags
        $("script, style, nav, footer, header").remove();

        // Extract text content
        const title = $("title").text().trim() || "Untitled Page";
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();

        // Limit text length for summarization
        const textToSummarize = bodyText.slice(0, 20000);

        if (!textToSummarize) {
            return NextResponse.json(
                { error: "No text content found on the page" },
                { status: 400 }
            );
        }

        // Summarize the content
        const summary = await summarizeText(textToSummarize);

        return NextResponse.json(
            {
                success: true,
                result: {
                    title,
                    summary,
                    url,
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
        console.error("Error in scrape API:", error);

        if (axios.isAxiosError(error)) {
            return NextResponse.json(
                { error: `Failed to fetch URL: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to scrape URL" },
            { status: 500 }
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
