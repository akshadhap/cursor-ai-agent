import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/groq";

/**
 * POST /api/agent/translate
 * Translates text to target language using Groq LLM
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, targetLanguage = "English" } = body;

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

        // Translate using Groq
        const translatedText = await translateText(text, targetLanguage);

        return NextResponse.json({
            success: true,
            result: translatedText,
            action: "translate",
            targetLanguage,
        });
    } catch (error) {
        console.error("Translation error:", error);
        return NextResponse.json(
            { error: "Failed to translate text" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
