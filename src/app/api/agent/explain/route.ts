import { NextRequest, NextResponse } from "next/server";
import { explainText } from "@/features/standalone-agents/agents/cursor-agent/lib/groq";

const MAX_LENGTH = 10000;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;

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

        // Call AI function
        const result = await explainText(text);

        return NextResponse.json(
            {
                success: true,
                result,
                action: "explain",
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
        console.error("Error in explain API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to explain text" },
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
