import { NextRequest, NextResponse } from "next/server";
import { generateEmail } from "@/lib/groq";

/**
 * POST /api/agent/generate-email
 * Generates an email draft from text using Groq LLM
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, tone = "professional" } = body;

        // Validate input
        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400 }
            );
        }

        if (text.length > 5000) {
            return NextResponse.json(
                { error: "Text is too long (max 5,000 characters)" },
                { status: 400 }
            );
        }

        // Generate email using Groq
        const email = await generateEmail(text, tone);

        return NextResponse.json({
            success: true,
            result: email,
            action: "generate-email",
            tone,
        });
    } catch (error) {
        console.error("Email generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate email" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
