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
 * DELETE /api/user/knowledge-base/[id]
 * Delete a knowledge base entry from agent config
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        // Get the user's Gmail Classifier agent
        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Use transaction to prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Re-read agent inside transaction to get latest config
            const currentAgent = await tx.standaloneAgent.findUnique({
                where: { id: agent.id },
            });

            if (!currentAgent) throw new Error("Agent not found");

            const currentConfig = (currentAgent.config as any) || {};
            const rawKB = currentConfig?.knowledgeBase;
            const existingEntries: KnowledgeBaseEntry[] = Array.isArray(rawKB) ? rawKB : [];

            // Find the entry
            const entryIndex = existingEntries.findIndex(e => e.id === id);
            if (entryIndex === -1) {
                return { found: false };
            }

            // Remove the entry
            const updatedEntries = existingEntries.filter(e => e.id !== id);

            await tx.standaloneAgent.update({
                where: { id: agent.id },
                data: {
                    config: {
                        ...currentConfig,
                        knowledgeBase: updatedEntries,
                    },
                },
            });

            return { found: true };
        });

        if (!result.found) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting knowledge base entry:", error);
        return NextResponse.json(
            { error: "Failed to delete entry" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/user/knowledge-base/[id]
 * Update a knowledge base entry
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const body = await req.json();
        const { content, title, tags, type } = body;

        // Get the user's Gmail Classifier agent
        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as any;
        const rawKB = config?.knowledgeBase;
        const existingEntries: KnowledgeBaseEntry[] = Array.isArray(rawKB) ? rawKB : [];

        // Find and update the entry
        const entryIndex = existingEntries.findIndex(e => e.id === id);
        if (entryIndex === -1) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        const updatedEntry: KnowledgeBaseEntry = {
            ...existingEntries[entryIndex],
            content: content ?? existingEntries[entryIndex].content,
            title: title ?? existingEntries[entryIndex].title,
            tags: tags ?? existingEntries[entryIndex].tags,
            type: type ?? existingEntries[entryIndex].type,
        };

        existingEntries[entryIndex] = updatedEntry;

        // Update agent config
        await prisma.standaloneAgent.update({
            where: { id: agent.id },
            data: {
                config: {
                    ...config,
                    knowledgeBase: existingEntries,
                },
            },
        });

        return NextResponse.json({ entry: updatedEntry });
    } catch (error) {
        console.error("Error updating knowledge base entry:", error);
        return NextResponse.json(
            { error: "Failed to update entry" },
            { status: 500 }
        );
    }
}
