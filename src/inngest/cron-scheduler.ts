import { inngest } from "./client";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import * as cronParser from "cron-parser";

/**
 * Cron Scheduler Function
 * Runs every minute and triggers workflows with matching CRON_TRIGGER nodes
 * 
 * Default: Executes every minute (* * * * *)
 * Can be overridden by setting cronExpression in the node configuration
 */
export const cronScheduler = inngest.createFunction(
    {
        id: "cron-scheduler",
        retries: 0,
    },
    {
        cron: "* * * * *",
    },
    async ({ step }) => {
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);

        console.log("[CRON] Scheduler running at:", now.toISOString());

        // Find all workflows with CRON_TRIGGER nodes
        const workflowsWithCron = await step.run("find-cron-workflows", async () => {
            const nodes = await prisma.node.findMany({
                where: {
                    type: NodeType.CRON_TRIGGER,
                },
                include: {
                    workflow: {
                        select: {
                            id: true,
                            userId: true,
                            name: true,
                        },
                    },
                },
            });

            console.log(`[CRON] Found ${nodes.length} workflow(s) with CRON_TRIGGER`);
            return nodes;
        });

        const workflowsToRun: { workflowId: string; cronData: Record<string, unknown> }[] = [];

        for (const node of workflowsWithCron) {
            const nodeData = node.data as Record<string, unknown> | null;

            // Default to every minute (* * * * *) if no expression is set
            const cronExpression = (nodeData?.cronExpression as string) || "* * * * *";
            const timezone = (nodeData?.timezone as string) || "UTC";

            console.log(`[CRON] Checking: ${node.workflow.name || node.workflow.id} (cron: ${cronExpression})`);

            try {
                // cron-parser v5 uses CronExpressionParser class
                const interval = cronParser.CronExpressionParser.parse(cronExpression, {
                    currentDate: now,
                    tz: timezone,
                });

                const prev = interval.prev().toDate();
                const diff = Math.abs(now.getTime() - prev.getTime());

                // Trigger if within 90 seconds of scheduled time
                if (diff < 90000) {
                    workflowsToRun.push({
                        workflowId: node.workflow.id,
                        cronData: {
                            scheduledAt: now.toISOString(),
                            cronExpression,
                            timezone,
                            triggeredBy: "cron-scheduler",
                        },
                    });
                    console.log(`[CRON] ✅ Triggering: ${node.workflow.id}`);
                }
            } catch (error) {
                console.error(`[CRON] ❌ Error parsing cron:`, error);
            }
        }

        // Trigger matching workflows
        if (workflowsToRun.length > 0) {
            await step.run("trigger-workflows", async () => {
                for (const workflow of workflowsToRun) {
                    await inngest.send({
                        name: "workflows/execute.workflow",
                        data: {
                            workflowId: workflow.workflowId,
                            initialData: workflow.cronData,
                        },
                    });
                }
                console.log(`[CRON] 🚀 Triggered ${workflowsToRun.length} workflow(s)`);
            });
        }

        return {
            checkedWorkflows: workflowsWithCron.length,
            triggeredWorkflows: workflowsToRun.length,
            timestamp: now.toISOString(),
        };
    }
);
