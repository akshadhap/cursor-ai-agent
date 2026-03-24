import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { generateWorkflowFromAI, executeAIGeneratedCode } from "@/inngest/ai-workflow-generator";
import { cronScheduler } from "@/inngest/cron-scheduler";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    generateWorkflowFromAI,
    executeAIGeneratedCode,
    cronScheduler,
  ],
});
