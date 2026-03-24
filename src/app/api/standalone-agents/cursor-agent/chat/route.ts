import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { optionalAuth } from "../../lib/auth-helper";
import { chatRateLimiter, createRateLimitHeaders } from "../../lib/rate-limit";
import { usageTracker } from "../../lib/usage-tracker";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.1-8b-instant";
const MAX_LENGTH = 5000;

export async function POST(request: NextRequest) {
    console.log("Chat API called");
    try {
        // 🔐 STEP 1: Authenticate user (Optional for now to ensure stability)
        const user = await optionalAuth() || { id: "default-user", email: "user@example.com" };
        console.log("User identification:", user.email);

        // ⏱️ STEP 2: Check rate limit (optional - only if Redis configured)
        // ⏱️ STEP 2: Check rate limit (optional - only if Redis configured)
        // Rate limiting is currently disabled or not configured.


        // ✅ STEP 3: Validate input
        const body = await request.json();
        const { text, options } = body;
        console.log("Request body:", { textLength: text?.length, hasOptions: !!options });

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                {
                    status: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    }
                }
            );
        }

        if (text.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_LENGTH} characters` },
                {
                    status: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    }
                }
            );
        }

        const context = options?.context || "";

        // 🤖 STEP 4: Call AI
        const messages: any[] = [
            {
                role: "system",
                content: `You are Spinabot, an elite AI assistant powered by Google technology. 
                
YOUR MISSION:
- Provide beautifully formatted, structured, and highly accurate responses.
- Use Markdown (headers, bold text, bullet points) for readability.
- Structure profile summaries with clear dividers (using === or ---) and bold headers.
- Keep responses clean, airy, and professional, similar to Gemini Workspace.
- If context is missing, still be helpful but mention you're acting on general knowledge.`,
            },
        ];

        if (context) {
            messages.push({
                role: "system",
                content: `Page context: ${context.slice(0, 12000)}`,
            });
        }

        messages.push({
            role: "user",
            content: text,
        });

        console.log("Calling Groq with model:", MODEL);
        const completion = await groq.chat.completions.create({
            messages,
            model: MODEL,
            temperature: 0.7,
            max_tokens: 1024,
        });
        console.log("Groq responded successfully");

        const result = completion.choices[0]?.message?.content || "No response generated.";
        const tokensUsed = completion.usage?.total_tokens || 0;

        // 📊 STEP 5: Track usage
        await usageTracker.track({
            userId: user.id,
            userEmail: user.email,
            endpoint: "/api/chat",
            method: "POST",
            tokensUsed,
            success: true,
        });

        // ✅ STEP 6: Return success
        return NextResponse.json(
            {
                success: true,
                result,
                action: "chat",
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            }
        );
    } catch (error) {
        // Track failed request
        try {
            const user = await optionalAuth() || { id: "unknown", email: "unknown" };
            await usageTracker.track({
                userId: user.id,
                userEmail: user.email,
                endpoint: "/api/chat",
                method: "POST",
                success: false,
                errorMessage: error instanceof Error ? error.message : "Unknown error",
            });
        } catch {
            // Ignore tracking errors
        }

        console.error("Error in chat API:", error);

        // Handle auth errors
        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json(
                { error: "Authentication required" },
                {
                    status: 401,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    }
                }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process chat request" },
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
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        }
    );
}
