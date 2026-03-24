import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.1-8b-instant";
const MAX_LENGTH = 5000;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, options } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        if (text.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_LENGTH} characters` },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        const tone = options?.tone || "professional";
        const tonePrompts: Record<string, string> = {
            professional: "professional, clear, and business-appropriate",
            casual: "casual, relaxed, and conversational",
            formal: "strictly formal, respectful, and structured",
            urgent: "direct, concise, and time-sensitive",
            friendly: "warm, inviting, and friendly",
            apologetic: "sincere, apologetic, and understanding",
        };

        // Fallback to professional if tone key not found, but try to use the raw tone string if valid
        const toneDesc = tonePrompts[tone.toLowerCase()] || tone;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Spinabot, an expert AI communication assistant. 
Your goal is to write a perfect, human-like email draft based on the user's context.

Tone: ${toneDesc}

Instructions:
1. Analyze the user's input to understand the core message, recipient (if implied), and goal.
2. Write a complete email draft including a suitable subject line.
3. The email should sound natural and appropriate for the requested tone.
4. Do NOT use placeholders like [Name] unless absolutely necessary; try to write around them or use generic polite forms if the name isn't known.
5. Return ONLY distinct, valid JSON. Do not add markdown formatting or explanations outside the JSON.

JSON Format:
{
  "subject": "The email subject line",
  "body": "The email body content"
}`,
                },
                {
                    role: "user",
                    content: `Draft an email based on these points:\n${text}`,
                },
            ],
            model: MODEL,
            temperature: 0.6,
            max_tokens: 1024,
            response_format: { type: "json_object" }, // Force JSON mode
        });

        const content = completion.choices[0]?.message?.content || "{}";

        let result;
        try {
            // Remove markdown code blocks if present (just in case)
            const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
            const parsed = JSON.parse(cleanContent);

            result = {
                subject: parsed.subject || "No Subject",
                body: parsed.body || text,
            };
        } catch (e) {
            console.error("JSON parse error:", e, "Content:", content);
            // Fallback: try to construct something meaningful if JSON fails
            result = {
                subject: "Draft Email",
                body: content.replace(/[{}]/g, "") // Strip braces to show raw text at least
            };
        }

        return NextResponse.json(
            {
                success: true,
                result,
                action: "generate-email",
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
        console.error("Error in generate-email API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate email" },
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                }
            }
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
