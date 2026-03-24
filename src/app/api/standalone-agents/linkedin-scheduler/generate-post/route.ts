/**
 * LinkedIn Scheduler - Generate Single Post API Route
 * Generate a LinkedIn post from a prompt
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

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
        const { prompt, agentId } = body;

        if (!prompt || !agentId) {
            return NextResponse.json({ error: "Missing prompt or agentId" }, { status: 400 });
        }

        // Verify agent ownership and get context
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as Record<string, unknown> || {};
        const companyProfile = config.companyProfile as Record<string, string> || {};

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                content: generateFallbackPost(prompt),
            });
        }

        const systemPrompt = `You are an expert LinkedIn content writer for ${companyProfile.businessName || "a professional business"} in the ${companyProfile.industry || "business"} industry.

Write a single, engaging LinkedIn post based on the user's request.

Guidelines:
- Start with a strong hook (first line should grab attention)
- Use short paragraphs (2-3 sentences max)
- Include line breaks for readability
- Add relevant emojis sparingly (2-4 per post)
- End with a call to action or question
- Include 3-5 relevant hashtags at the end
- Keep under 3000 characters
- Make it authentic and valuable

Target audience: ${companyProfile.targetAudience || "business professionals"}
Tone: ${companyProfile.contentTone || "professional yet approachable"}

Return ONLY the post content, nothing else.`;

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Write a LinkedIn post about: ${prompt}` },
                ],
                temperature: 0.8,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            console.error("[Generate Post] Groq error:", await response.text());
            return NextResponse.json({ content: generateFallbackPost(prompt) });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || generateFallbackPost(prompt);

        return NextResponse.json({ success: true, content });
    } catch (error) {
        console.error("[Generate Post] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Generation failed" },
            { status: 500 }
        );
    }
}

function generateFallbackPost(prompt: string): string {
    return `🚀 Excited to share some thoughts on ${prompt}!

In today's rapidly evolving landscape, staying ahead means embracing change and continuous learning.

Here are 3 key takeaways:

1️⃣ Stay curious and keep learning
2️⃣ Build meaningful connections
3️⃣ Share your knowledge with others

What are your thoughts on this topic? I'd love to hear your perspective in the comments! 👇

#LinkedIn #ProfessionalGrowth #Industry`;
}
