import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - AI Chat API Route (Conversational Brainstorming)
 * 
 * Features:
 * - Multi-turn conversation with history
 * - Brainstorming mode - asks clarifying questions before generating
 * - Industry analysis and personalized suggestions
 * - Iterative content refinement
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: string;
}

interface CompanyProfile {
    businessName?: string;
    industry?: string;
    description?: string;
    targetAudience?: string;
    contentTone?: string;
}

// POST - Send message and get response
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { agentId, message, clearHistory, context } = body;

        if (!agentId || !message) {
            return NextResponse.json({ error: "Missing agentId or message" }, { status: 400 });
        }

        // Verify agent ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const data = (agent.data as Record<string, unknown>) || {};
        const storedProfile = (config.businessProfile || {}) as CompanyProfile;

        // Merge frontend context with stored profile (frontend context takes priority)
        const profile: CompanyProfile = {
            businessName: context?.companyName || storedProfile.businessName,
            industry: context?.industry || storedProfile.industry,
            description: context?.description || storedProfile.description,
            targetAudience: context?.targetAudience || storedProfile.targetAudience,
            contentTone: context?.contentTone || storedProfile.contentTone,
        };

        logger.info("[Chat] Using profile:", profile.businessName, "-", profile.industry);

        // Get or initialize chat history
        let chatHistory = (data.chatHistory || []) as ChatMessage[];

        // Clear history if requested
        if (clearHistory) {
            chatHistory = [];
        }

        // Add user message to history
        const userMessage: ChatMessage = {
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
        };
        chatHistory.push(userMessage);

        // Keep only last 20 messages to manage context
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                response: "I'm currently unavailable. Please configure the GROQ_API_KEY to enable AI chat.",
                history: chatHistory,
            });
        }

        // Build the system prompt for brainstorming mode
        const systemPrompt = buildBrainstormingPrompt(profile);

        // Build messages array with history
        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        ];

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 0.8,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Chat] Groq error:", errorText);
            return NextResponse.json({
                response: "Sorry, I encountered an error. Please try again in a moment.",
                history: chatHistory,
            });
        }

        const responseData = await response.json();
        const assistantContent = responseData.choices[0]?.message?.content ||
            "Sorry, I couldn't generate a response. Let's try again - what kind of post are you looking to create?";

        // Add assistant response to history
        const assistantMessage: ChatMessage = {
            role: "assistant",
            content: assistantContent,
            timestamp: new Date().toISOString(),
        };
        chatHistory.push(assistantMessage);

        // Save updated chat history
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify({
                    ...data,
                    chatHistory,
                })),
            },
        });

        return NextResponse.json({
            success: true,
            response: assistantContent,
            history: chatHistory,
        });
    } catch (error) {
        console.error("[Chat] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Chat failed" },
            { status: 500 }
        );
    }
}

// GET - Retrieve chat history
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const data = (agent.data as Record<string, unknown>) || {};
        const chatHistory = (data.chatHistory || []) as ChatMessage[];

        return NextResponse.json({
            success: true,
            history: chatHistory,
        });
    } catch (error) {
        console.error("[Chat] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get history" },
            { status: 500 }
        );
    }
}

// DELETE - Clear chat history
export async function DELETE(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const data = (agent.data as Record<string, unknown>) || {};

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify({
                    ...data,
                    chatHistory: [],
                })),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Chat history cleared",
        });
    } catch (error) {
        console.error("[Chat] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to clear history" },
            { status: 500 }
        );
    }
}

/**
 * Build the brainstorming system prompt
 */
function buildBrainstormingPrompt(profile: CompanyProfile): string {
    const businessName = profile.businessName || "your business";
    const industry = profile.industry || "your industry";
    const description = profile.description || "";
    const targetAudience = profile.targetAudience || "professionals";
    const contentTone = profile.contentTone || "professional yet approachable";

    return `You are a LinkedIn content strategist having a collaborative brainstorming session with ${businessName}.

BUSINESS CONTEXT:
- Industry: ${industry}
- Description: ${description}
- Target Audience: ${targetAudience}
- Preferred Tone: ${contentTone}

YOUR BRAINSTORMING APPROACH:
1. UNDERSTAND FIRST - Before generating any post, understand what the user wants to achieve:
   - What's the goal? (awareness, engagement, leads, thought leadership)
   - Who's the target audience for this specific post?
   - Any specific topic, trend, or pain point to address?

2. ASK CLARIFYING QUESTIONS - Don't immediately generate content. Ask 1-2 focused questions like:
   - "What's the main message you want to convey?"
   - "Is this about a recent trend, personal story, or industry insight?"
   - "Are you looking to educate, inspire, or start a discussion?"

3. COLLABORATIVE GENERATION - When you have enough context:
   - Offer 2-3 different angles or approaches
   - Let the user pick their favorite direction
   - Then craft the full post based on their choice

4. ITERATE AND REFINE - After showing a draft:
   - Ask if they want any adjustments
   - Offer to tweak the hook, tone, or call-to-action
   - Be ready to try completely different approaches

FORMAT FOR POSTS:
- Strong hook in the first line (stop the scroll!)
- Short paragraphs (1-2 sentences each)
- Use line breaks for readability
- Include relevant emojis (sparingly, 2-4 max)
- End with a question or call-to-action
- Suggest 3-5 relevant hashtags at the end
- Keep under 2500 characters

IMPORTANT:
- Be conversational and collaborative, not robotic
- If the user just says "write a post" or something vague, ask what topic or goal they have in mind
- Reference their industry and audience in suggestions
- Celebrate when they like an idea - "Great choice! Here's the full post..."

Remember: You're a brainstorming partner, not just a content generator. Help them think through their content strategy!`;
}
