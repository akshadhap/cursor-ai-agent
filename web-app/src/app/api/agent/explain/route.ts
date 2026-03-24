import { NextRequest, NextResponse } from "next/server";
import { explainText } from "@/lib/groq";

/**
 * POST /api/agent/explain
 * Explains text in simple terms using Groq LLM
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

        if (text.length > 10000) {
            return NextResponse.json(
                { error: "Text is too long (max 10,000 characters)" },
                { status: 400 }
            );
        }

        // Explain using Groq
        const explanation = await explainText(text);

        return NextResponse.json({
            success: true,
            result: explanation,
            action: "explain",
        });
    } catch (error) {
        console.error("Explanation error:", error);
        return NextResponse.json(
            { error: "Failed to explain text" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
