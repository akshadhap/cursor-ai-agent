/**
 * Automation Rules API
 * CRUD operations for automation rules stored in agent config
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { AutomationRule, generateRuleId } from "@/lib/automation";

// GET - List all automation rules
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as any) || {};
        const rules: AutomationRule[] = config.automationRules || [];

        return NextResponse.json({ rules });
    } catch (error) {
        console.error("[AutomationRules] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }
}

// POST - Create a new automation rule
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, rule } = body;

        if (!agentId || !rule) {
            return NextResponse.json({ error: "Agent ID and rule required" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as any) || {};
        const existingRules: AutomationRule[] = config.automationRules || [];

        // Create new rule with ID and timestamps
        const newRule: AutomationRule = {
            ...rule,
            id: generateRuleId(),
            createdAt: new Date().toISOString(),
        };

        // Add to rules list
        const updatedRules = [...existingRules, newRule];

        // Update agent config
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    automationRules: updatedRules,
                },
            },
        });

        console.log("[AutomationRules] Created rule:", newRule.id, newRule.name);

        return NextResponse.json({ rule: newRule, success: true });
    } catch (error) {
        console.error("[AutomationRules] POST error:", error);
        return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
    }
}

// PATCH - Update an automation rule
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, ruleId, updates } = body;

        if (!agentId || !ruleId) {
            return NextResponse.json({ error: "Agent ID and rule ID required" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as any) || {};
        const existingRules: AutomationRule[] = config.automationRules || [];

        // Find and update the rule
        const ruleIndex = existingRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        const updatedRule: AutomationRule = {
            ...existingRules[ruleIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        existingRules[ruleIndex] = updatedRule;

        // Update agent config
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    automationRules: existingRules,
                },
            },
        });

        console.log("[AutomationRules] Updated rule:", ruleId);

        return NextResponse.json({ rule: updatedRule, success: true });
    } catch (error) {
        console.error("[AutomationRules] PATCH error:", error);
        return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }
}

// DELETE - Delete an automation rule
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const ruleId = searchParams.get("ruleId");

        if (!agentId || !ruleId) {
            return NextResponse.json({ error: "Agent ID and rule ID required" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as any) || {};
        const existingRules: AutomationRule[] = config.automationRules || [];

        // Remove the rule
        const updatedRules = existingRules.filter(r => r.id !== ruleId);

        // Update agent config
        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    automationRules: updatedRules,
                },
            },
        });

        console.log("[AutomationRules] Deleted rule:", ruleId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AutomationRules] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }
}
