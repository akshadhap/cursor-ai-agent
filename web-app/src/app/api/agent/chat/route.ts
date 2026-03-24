import { NextRequest, NextResponse } from "next/server";
import { chatWithAi } from "@/lib/groq";

/**
 * POST /api/agent/chat
 * Chat with Spinabot
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, context } = body;

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const reply = await chatWithAi(text, context);

        return NextResponse.json({
            success: true,
            result: reply,
            action: "chat",
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
