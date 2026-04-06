/**
 * LinkedIn Scheduler - Smart Rules API
 * Rule-based auto-response configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Smart Rule configuration
export interface SmartRule {
    id: string;
    name: string;
    keywords: string[];         // Trigger keywords
    response: string;           // Auto-response message
    enabled: boolean;
    notifyOnReply: boolean;     // Notify user when triggered
    createdAt: string;
    triggeredCount: number;
}

// GET - List all smart rules for an agent
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
        const smartRules = (config.smartRules || []) as SmartRule[];

        return NextResponse.json({
            success: true,
            smartRules,
        });
    } catch (error) {
        console.error("[Smart Rules] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get smart rules" },
            { status: 500 }
        );
    }
}

// POST - Create or update a smart rule
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

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        if (!rule?.name || !rule?.keywords?.length || !rule?.response) {
            return NextResponse.json({ error: "Missing required fields: name, keywords, response" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const existingRules = (config.smartRules || []) as SmartRule[];

        let updatedRules: SmartRule[];
        let isUpdate = false;

        if (rule.id) {
            // Update existing rule
            isUpdate = true;
            updatedRules = existingRules.map((r) =>
                r.id === rule.id
                    ? {
                        ...r,
                        name: rule.name,
                        keywords: rule.keywords.map((k: string) => k.toLowerCase()),
                        response: rule.response,
                        enabled: rule.enabled ?? r.enabled,
                        notifyOnReply: rule.notifyOnReply ?? r.notifyOnReply,
                    }
                    : r
            );
        } else {
            // Create new rule
            const newRule: SmartRule = {
                id: `sr_${Date.now()}`,
                name: rule.name,
                keywords: rule.keywords.map((k: string) => k.toLowerCase()),
                response: rule.response,
                enabled: true,
                notifyOnReply: rule.notifyOnReply ?? false,
                createdAt: new Date().toISOString(),
                triggeredCount: 0,
            };
            updatedRules = [...existingRules, newRule];
        }

        const updatedConfig = {
            ...config,
            smartRules: updatedRules,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            message: isUpdate ? "Smart rule updated" : "Smart rule created",
            smartRules: updatedRules,
        });
    } catch (error) {
        console.error("[Smart Rules] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to save smart rule" },
            { status: 500 }
        );
    }
}

// DELETE - Remove a smart rule
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
        const existingRules = (config.smartRules || []) as SmartRule[];

        const updatedRules = existingRules.filter((r) => r.id !== ruleId);

        const updatedConfig = {
            ...config,
            smartRules: updatedRules,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Smart rule deleted",
            smartRules: updatedRules,
        });
    } catch (error) {
        console.error("[Smart Rules] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete smart rule" },
            { status: 500 }
        );
    }
}
