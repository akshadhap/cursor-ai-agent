import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

interface KnowledgeBaseEntry {
    id: string;
    content: string;
    title: string;
    tags: string[];
    type: string;
    createdAt: string;
}

/**
 * GET /api/user/knowledge-base
 * List all knowledge base entries for the current user's agent
 */
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
            return NextResponse.json({ entries: [] });
        }

        // Get the user's Gmail Classifier agent
        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
            select: { config: true },
        });

        if (!agent) {
            return NextResponse.json({ entries: [] });
        }

        const config = agent.config as any;
        const rawKB = config?.knowledgeBase;
        const entries = Array.isArray(rawKB) ? rawKB : [];

        return NextResponse.json({ entries });
    } catch (error) {
        console.error("Error fetching knowledge base:", error);
        return NextResponse.json(
            { error: "Failed to fetch knowledge base" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/user/knowledge-base
 * Create a new knowledge base entry (stored in agent config)
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content, title, tags = [], type = "text" } = body;

        if (!content || typeof content !== "string") {
            return NextResponse.json(
                { error: "Content is required" },
                { status: 400 }
            );
        }

        // Ensure user exists in DB
        const dbUser = await prisma.user.upsert({
            where: { email: session.user.email },
            update: {},
            create: {
                id: session.user.email,
                email: session.user.email,
                name: session.user.name || session.user.email.split("@")[0],
            },
        });

        // Get or create the user's Gmail Classifier agent
        let agent = await prisma.standaloneAgent.findFirst({
            where: { userId: dbUser.id, type: "GMAIL_CLASSIFIER" },
        });

        if (!agent) {
            // Create agent if it doesn't exist
            agent = await prisma.standaloneAgent.create({
                data: {
                    name: "Email Assistant",
                    type: "GMAIL_CLASSIFIER",
                    status: "DRAFT",
                    userId: dbUser.id,
                    config: { knowledgeBase: [] },
                },
            });
        }

        // Create new entry
        const newEntry: KnowledgeBaseEntry = {
            id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content,
            title: title || content.substring(0, 50) + "...",
            tags: Array.isArray(tags) ? tags : [],
            type,
            createdAt: new Date().toISOString(),
        };

        // Use transaction to prevent race conditions
        await prisma.$transaction(async (tx) => {
            // Re-read agent inside transaction to get latest config
            const currentAgent = await tx.standaloneAgent.findUnique({
                where: { id: agent.id },
            });

            if (!currentAgent) throw new Error("Agent not found");

            const currentConfig = (currentAgent.config as any) || {};
            const rawKB = currentConfig?.knowledgeBase;
            const existingEntries: KnowledgeBaseEntry[] = Array.isArray(rawKB) ? rawKB : [];

            // Limit to 100 entries to prevent unbounded growth
            const updatedEntries = [newEntry, ...existingEntries].slice(0, 100);

            await tx.standaloneAgent.update({
                where: { id: agent.id },
                data: {
                    config: {
                        ...currentConfig,
                        knowledgeBase: updatedEntries,
                    },
                },
            });
        });

        return NextResponse.json({ entry: newEntry });
    } catch (error: any) {
        console.error("Error creating knowledge base entry:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to create entry" },
            { status: 500 }
        );
    }
}
