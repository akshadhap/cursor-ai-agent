import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - Automation Rules API Route
 * Manage auto-reply rules for LinkedIn messages
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

export interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: "new_today" | "all_unread" | "keyword";
    keyword?: string;
    replyMessage: string;
    delay: number; // seconds
    createdAt: string;
}

// GET - Fetch automation rules
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
        const rules = (config.automationRules || []) as AutomationRule[];

        return NextResponse.json({ success: true, rules });
    } catch (error) {
        console.error("[Automation] Error fetching rules:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Fetch failed" },
            { status: 500 }
        );
    }
}

// POST - Create or update automation rule
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
        const { agentId, rule } = body as { agentId: string; rule: Partial<AutomationRule> };

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
        const existingRules = (config.automationRules || []) as AutomationRule[];

        let updatedRules: AutomationRule[];
        let newRuleId: string = rule.id || "";

        if (rule.id && existingRules.some(r => r.id === rule.id)) {
            // Update existing rule
            updatedRules = existingRules.map(r =>
                r.id === rule.id ? { ...r, ...rule } : r
            );
        } else {
            // Create new rule
            newRuleId = `rule-${Date.now()}`;
            const newRule: AutomationRule = {
                id: newRuleId,
                name: rule.name || "New Rule",
                enabled: rule.enabled ?? true,
                trigger: rule.trigger || "new_today",
                keyword: rule.keyword,
                replyMessage: rule.replyMessage || "Hi! Thanks for reaching out.",
                delay: rule.delay || 0,
                createdAt: new Date().toISOString(),
            };
            updatedRules = [...existingRules, newRule];
        }

        // Sync to unified automations panel (dm_reply type)
        const existingUnifiedAutomations = (config.unifiedAutomations || []) as Array<Record<string, unknown>>;
        const syncedRule = updatedRules.find(r => r.id === (rule.id || newRuleId));

        if (syncedRule) {
            // Convert inbox rule to unified automation format
            const unifiedRule = {
                id: `unified-${syncedRule.id}`,
                sourceId: syncedRule.id, // Track the source rule
                type: "dm_reply",
                name: syncedRule.name,
                enabled: syncedRule.enabled,
                triggerType: syncedRule.trigger === "keyword" ? "keyword" : "all_new",
                keywords: syncedRule.keyword ? [syncedRule.keyword] : [],
                responseTemplate: syncedRule.replyMessage,
                triggeredCount: 0,
                createdAt: syncedRule.createdAt,
                updatedAt: new Date().toISOString(),
            };

            // Update or add to unified automations
            const existingIndex = existingUnifiedAutomations.findIndex(
                (a) => a.sourceId === syncedRule.id
            );

            let updatedUnifiedAutomations: Array<Record<string, unknown>>;
            if (existingIndex >= 0) {
                updatedUnifiedAutomations = existingUnifiedAutomations.map((a, i) =>
                    i === existingIndex ? unifiedRule : a
                );
            } else {
                updatedUnifiedAutomations = [...existingUnifiedAutomations, unifiedRule];
            }

            const updatedConfig = {
                ...config,
                automationRules: updatedRules,
                unifiedAutomations: updatedUnifiedAutomations,
            };

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify(updatedConfig)),
                },
            });

            logger.info(`[Automation Sync] Synced inbox rule ${syncedRule.id} to unified automations`);
        } else {
            const updatedConfig = {
                ...config,
                automationRules: updatedRules,
            };

            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: JSON.parse(JSON.stringify(updatedConfig)),
                },
            });
        }

        return NextResponse.json({ success: true, rules: updatedRules });
    } catch (error) {
        console.error("[Automation] Error saving rule:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Save failed" },
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

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const ruleId = searchParams.get("ruleId");

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
        const existingRules = (config.automationRules || []) as AutomationRule[];
        const updatedRules = existingRules.filter(r => r.id !== ruleId);

        // Also remove from unified automations
        const existingUnifiedAutomations = (config.unifiedAutomations || []) as Array<Record<string, unknown>>;
        const updatedUnifiedAutomations = existingUnifiedAutomations.filter(
            (a) => a.sourceId !== ruleId
        );

        const updatedConfig = {
            ...config,
            automationRules: updatedRules,
            unifiedAutomations: updatedUnifiedAutomations,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        logger.info(`[Automation Sync] Deleted inbox rule ${ruleId} and synced to unified automations`);

        return NextResponse.json({ success: true, rules: updatedRules });
    } catch (error) {
        console.error("[Automation] Error deleting rule:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 }
        );
    }
}
