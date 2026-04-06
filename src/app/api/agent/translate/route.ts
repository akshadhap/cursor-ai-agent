import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/features/standalone-agents/agents/cursor-agent/lib/groq";

const MAX_LENGTH = 10000;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, options } = body;

        // Validation
        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400 }
            );
        }

        if (text.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_LENGTH} characters` },
                { status: 400 }
            );
        }

        const targetLanguage = options?.targetLanguage || "English";

        // Call AI function
        const result = await translateText(text, targetLanguage);

        return NextResponse.json(
            {
                success: true,
                result,
                action: "translate",
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
        console.error("Error in translate API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to translate text" },
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
