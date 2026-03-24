/**
 * Unified Automations API
 * Manages all automation rules: DM auto-replies, comment replies, lead capture
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

interface AutomationRule {
    id: string;
    type: "dm_reply" | "comment_reply" | "lead_capture";
    name: string;
    enabled: boolean;
    triggerType: "keyword" | "all_new";
    keywords: string[];
    responseTemplate: string;
    postId?: string;
    postUrl?: string;
    postText?: string;
    publicReply?: string;
    dmMessage?: string;
    attachmentUrl?: string;
    triggeredCount: number;
    createdAt: string;
    updatedAt: string;
}

// GET - Fetch all automation rules
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

        const config = (agent.config as Record<string, unknown>) || {};

        // Combine all automation sources into unified format
        const rules: AutomationRule[] = [];

        // Smart Rules -> dm_reply
        const smartRules = (config.smartRules || []) as any[];
        for (const rule of smartRules) {
            rules.push({
                id: rule.id || `smart-${Date.now()}`,
                type: "dm_reply",
                name: rule.name || "Untitled Rule",
                enabled: rule.enabled ?? true,
                triggerType: "keyword",
                keywords: rule.keywords || [],
                responseTemplate: rule.response || "",
                triggeredCount: rule.triggeredCount || 0,
                createdAt: rule.createdAt || new Date().toISOString(),
                updatedAt: rule.createdAt || new Date().toISOString(),
            });
        }

        // Post Automations -> comment_reply or lead_capture
        const postAutomations = (config.postAutomations || []) as any[];
        for (const auto of postAutomations) {
            const hasLeadCapture = auto.dmMessage && auto.dmMessage.trim().length > 0;
            rules.push({
                id: auto.postId || `post-${Date.now()}`,
                type: hasLeadCapture ? "lead_capture" : "comment_reply",
                name: `Post: ${(auto.postText || "").slice(0, 30)}...` || "Post Automation",
                enabled: auto.enabled ?? true,
                triggerType: "keyword",
                keywords: auto.keywords || [],
                responseTemplate: "",
                postId: auto.postId,
                postUrl: auto.postUrl,
                postText: auto.postText,
                publicReply: auto.publicReply || "",
                dmMessage: auto.dmMessage || "",
                attachmentUrl: auto.attachmentUrl,
                triggeredCount: auto.triggeredCount || 0,
                createdAt: auto.createdAt || new Date().toISOString(),
                updatedAt: auto.createdAt || new Date().toISOString(),
            });
        }

        return NextResponse.json({ rules });
    } catch (error) {
        console.error("[Automations API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch automations" },
            { status: 500 }
        );
    }
}

// POST - Create new automation rule
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
        const { agentId, rule } = body;

        if (!agentId || !rule) {
            return NextResponse.json({ error: "Missing agentId or rule" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const now = new Date().toISOString();

        if (rule.type === "dm_reply") {
            // Add to smartRules
            const smartRules = [...((config.smartRules || []) as any[])];
            smartRules.push({
                id: `smart-${Date.now()}`,
                name: rule.name,
                keywords: rule.keywords || [],
                response: rule.responseTemplate,
                enabled: true,
                notifyOnReply: false,
                triggeredCount: 0,
                createdAt: now,
            });

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({ ...config, smartRules })),
                },
            });
        } else {
            // Add to postAutomations
            const postAutomations = [...((config.postAutomations || []) as any[])];

            // Extract post ID from URL
            let postId = rule.postId;
            if (!postId && rule.postUrl) {
                const match = rule.postUrl.match(/activity[:\-](\d+)/);
                postId = match ? match[1] : `post-${Date.now()}`;
            }

            postAutomations.push({
                postId,
                postUrl: rule.postUrl,
                postText: rule.name,
                keywords: rule.keywords || [],
                publicReply: rule.publicReply || "",
                dmMessage: rule.dmMessage || "",
                attachmentUrl: rule.attachmentUrl,
                enabled: true,
                triggeredCount: 0,
                createdAt: now,
            });

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({ ...config, postAutomations })),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Automations API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create automation" },
            { status: 500 }
        );
    }
}

// PUT - Update automation rule
export async function PUT(req: NextRequest) {
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
        const { agentId, ruleId, rule } = body;

        if (!agentId || !ruleId) {
            return NextResponse.json({ error: "Missing agentId or ruleId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};

        // Check if it's a smart rule
        if (ruleId.startsWith("smart-")) {
            const smartRules = [...((config.smartRules || []) as any[])];
            const index = smartRules.findIndex(r => r.id === ruleId);

            if (index >= 0) {
                smartRules[index] = { ...smartRules[index], ...rule };
                await prisma.standaloneAgent.update({
                    where: { id: agentId },
                    data: {
                        config: JSON.parse(JSON.stringify({ ...config, smartRules })),
                    },
                });
            }
        } else {
            // It's a post automation
            const postAutomations = [...((config.postAutomations || []) as any[])];
            const index = postAutomations.findIndex(a => a.postId === ruleId);

            if (index >= 0) {
                postAutomations[index] = { ...postAutomations[index], ...rule };
                await prisma.standaloneAgent.update({
                    where: { id: agentId },
                    data: {
                        config: JSON.parse(JSON.stringify({ ...config, postAutomations })),
                    },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Automations API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update automation" },
            { status: 500 }
        );
    }
}

// DELETE - Delete automation rule
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

        const body = await req.json();
        const { agentId, ruleId } = body;

        if (!agentId || !ruleId) {
            return NextResponse.json({ error: "Missing agentId or ruleId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};

        // Check if it's a smart rule
        if (ruleId.startsWith("smart-")) {
            const smartRules = ((config.smartRules || []) as any[]).filter(r => r.id !== ruleId);
            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({ ...config, smartRules })),
                },
            });
        } else {
            // It's a post automation
            const postAutomations = ((config.postAutomations || []) as any[]).filter(a => a.postId !== ruleId);
            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify({ ...config, postAutomations })),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Automations API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete automation" },
            { status: 500 }
        );
    }
}
