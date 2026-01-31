import { NextRequest, NextResponse } from "next/server";
import { generateTask } from "@/lib/groq";

/**
 * POST /api/agent/generate-task
 * Generates a structured task from text using Groq LLM
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

        if (text.length > 5000) {
            return NextResponse.json(
                { error: "Text is too long (max 5,000 characters)" },
                { status: 400 }
            );
        }

        // Generate task using Groq
        const task = await generateTask(text);

        return NextResponse.json({
            success: true,
            result: task,
            action: "generate-task",
        });
    } catch (error) {
        console.error("Task generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate task" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
