import { NextRequest, NextResponse } from "next/server";
import { rewriteText } from "@/lib/groq";

/**
 * POST /api/agent/rewrite
 * Rewrites text in specified style using Groq LLM
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, style = "professional" } = body;

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

        // Rewrite using Groq
        const rewrittenText = await rewriteText(text, style);

        return NextResponse.json({
            success: true,
            result: rewrittenText,
            action: "rewrite",
            style,
        });
    } catch (error) {
        console.error("Rewrite error:", error);
        return NextResponse.json(
            { error: "Failed to rewrite text" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
