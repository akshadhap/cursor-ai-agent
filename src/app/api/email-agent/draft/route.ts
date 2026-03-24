import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { getGmailMessage, createGmailDraft } from "@/lib/gmail/client";

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
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { emailId, instruction = "Reply positively", agentId } = body;

        if (!emailId || !agentId) {
            return NextResponse.json({ error: "Email ID and Agent ID are required" }, { status: 400 });
        }

        // Get Gmail Credentials (specific agent)
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true, userId: true },
        });

        if (!agent || agent.userId !== user.id) {
            return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 404 });
        }



        const config = agent?.config as any;
        // Check root first (standard), then nested (legacy/manual?)
        const accessToken = config?.accessToken || config?.gmail?.access_token;

        if (!accessToken) {
            return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
        }

        // 1. Fetch Original Email
        const originalEmail = await getGmailMessage(accessToken, emailId);
        if (!originalEmail) {
            return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
        }

        // 2. Get Knowledge Base from agent config (with defensive array check)
        const rawKB = config?.knowledgeBase;
        const knowledgeBase = Array.isArray(rawKB) ? rawKB.slice(0, 10) : [];

        // 3. Generate Reply with LLM
        const replyBody = await generateReply(
            originalEmail,
            instruction,
            user.name || "User",
            knowledgeBase.map((k: any) => k.content)
        );

        // 4. Create Draft in Gmail
        const draftResult = await createGmailDraft(accessToken, {
            to: originalEmail.from, // Reply to sender
            subject: originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`,
            body: replyBody,
            threadId: originalEmail.threadId
        });

        if (draftResult.error) {
            return NextResponse.json({ error: draftResult.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            draft: draftResult.output,
            reply: replyBody
        });

    } catch (error: any) {
        console.error("Draft API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    }
}

async function generateReply(email: any, instruction: string, userName: string, knowledge: string[]): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return "Error: No LLM API Key";

    const systemPrompt = `You are an AI email assistant acting on behalf of ${userName}.
    
    YOUR GOAL: Write a email reply based on the USER INSTRUCTION.
    
    CONTEXT (The email we are replying to):
    From: ${email.from}
    Subject: ${email.subject}
    Body Snippet: ${email.body.substring(0, 1000)}...

    USER KNOWLEDGE / PREFERENCES:
    ${knowledge.map(k => `- ${k}`).join("\n")}

    INSTRUCTION: ${instruction}

    RULES:
    1. Write ONLY the body of the email. No subject line, no extra "Here is the draft" text.
    2. Be professional but natural.
    3. Use the knowledge base if relevant (e.g. if the user is a student, say so).
    4. Sign off as ${userName}.
    `;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0.7,
            }),
        });

        // Handle rate limiting and errors
        if (!response.ok) {
            console.error(`Draft API - Groq error (${response.status})`);
            if (response.status === 429) {
                return "⚠️ AI service rate limited. Please wait a few seconds and try again.";
            }
            if (response.status === 401 || response.status === 403) {
                return "⚠️ AI service authentication failed.";
            }
            return "Could not generate reply due to AI service error.";
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Could not generate reply.";
    } catch (e) {
        console.error("LLM Generation Error:", e);
        return "Thinking process failed. Here is a generic placeholder.";
    }
}
