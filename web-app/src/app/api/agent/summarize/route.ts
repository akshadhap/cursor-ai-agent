import { NextRequest, NextResponse } from "next/server";
import { summarizeText } from "@/lib/groq";

/**
 * POST /api/agent/summarize
 * Summarizes text using Groq LLM
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;

        // Validate input
        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400 }
            );
        }

        if (text.length > 20000) {
            return NextResponse.json(
                { error: "Text is too long (max 20,000 characters)" },
                { status: 400 }
            );
        }

        // Summarize using Groq
        const summary = await summarizeText(text);

        return NextResponse.json({
            success: true,
            result: summary,
            action: "summarize",
        });
    } catch (error) {
        console.error("Summarization error:", error);
        return NextResponse.json(
            { error: "Failed to summarize text" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
