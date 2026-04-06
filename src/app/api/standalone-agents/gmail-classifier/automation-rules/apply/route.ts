import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { evaluateRules, executeAction, AutomationRule, EmailForRules } from "@/lib/automation";

/**
 * Apply automation rules to existing emails
 * POST /api/standalone-agents/gmail-classifier/automation-rules/apply
 * 
 * Body: {
 *   agentId: string,
 *   filter: {
 *     category?: string,
 *     emailIds?: string[],
 *     dateFrom?: string,
 *     dateTo?: string,
 *     priority?: string,
 *   },
 *   dryRun?: boolean  // If true, only return what would be executed
 * }
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, filter, dryRun = false } = body;

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        // Get agent and rules
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: {
                config: true,
                userId: true,
            },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as any;
        const emails = config?.emails || [];
        const rules = (config?.automationRules || []).filter((r: AutomationRule) => r.enabled);

        if (rules.length === 0) {
            return NextResponse.json({
                message: "No enabled rules found",
                matched: 0,
                executed: 0,
            });
        }

        // Filter emails based on criteria
        let filteredEmails = emails;

        if (filter?.category) {
            filteredEmails = filteredEmails.filter((e: any) => e.category === filter.category);
        }

        if (filter?.emailIds && filter.emailIds.length > 0) {
            filteredEmails = filteredEmails.filter((e: any) => filter.emailIds.includes(e.id));
        }

        if (filter?.priority) {
            filteredEmails = filteredEmails.filter((e: any) => e.priority === filter.priority);
        }

        if (filter?.dateFrom) {
            const fromDate = new Date(filter.dateFrom);
            filteredEmails = filteredEmails.filter((e: any) => new Date(e.date) >= fromDate);
        }

        if (filter?.dateTo) {
            const toDate = new Date(filter.dateTo);
            filteredEmails = filteredEmails.filter((e: any) => new Date(e.date) <= toDate);
        }

        console.log(`[ApplyRules] Checking ${filteredEmails.length} emails against ${rules.length} rules`);

        // Evaluate and execute rules
        const results: Array<{
            emailId: string;
            subject: string;
            ruleName: string;
            action: string;
            status: 'executed' | 'dry-run' | 'failed';
            result?: string;
            error?: string;
        }> = [];

        for (const email of filteredEmails) {
            const emailForRules: EmailForRules = {
                id: email.id,
                subject: email.subject || '',
                body: email.body || email.snippet || '',
                snippet: email.snippet || '',
                from: email.from || '',
                category: email.category || '',
                priority: email.priority || 'medium',
                labels: email.labels || [],
                date: email.date || new Date().toISOString(),
            };

            // Evaluate rules
            const matchingRules = evaluateRules(emailForRules, rules);

            for (const ruleResult of matchingRules) {
                const action = ruleResult.action;
                if (dryRun) {
                    // Dry run - just record what would happen
                    results.push({
                        emailId: email.id,
                        subject: email.subject,
                        ruleName: ruleResult.ruleName,
                        action: action.type,
                        status: 'dry-run',
                    });
                } else {
                    // Actually execute the action
                    try {
                        // Build agentConfig from stored config
                        const agentConfig = {
                            jira: config.jira,
                            notion: config.notion,
                            jiraProjectKey: config.jiraProjectKey,
                        };
                        const actionResult = await executeAction(emailForRules, action, agentConfig);
                        results.push({
                            emailId: email.id,
                            subject: email.subject,
                            ruleName: ruleResult.ruleName,
                            action: action.type,
                            status: 'executed',
                            result: actionResult.message,
                        });
                        console.log(`[ApplyRules] ${ruleResult.ruleName}: ${actionResult.message}`);
                    } catch (error) {
                        results.push({
                            emailId: email.id,
                            subject: email.subject,
                            ruleName: ruleResult.ruleName,
                            action: action.type,
                            status: 'failed',
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                    }

                    // Small delay between actions
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }

        return NextResponse.json({
            success: true,
            dryRun,
            emailsChecked: filteredEmails.length,
            rulesChecked: rules.length,
            matched: results.length,
            executed: results.filter(r => r.status === 'executed').length,
            failed: results.filter(r => r.status === 'failed').length,
            results,
        });

    } catch (error) {
        console.error("[ApplyRules] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
