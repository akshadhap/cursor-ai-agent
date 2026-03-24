import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { openAiChannel } from "./channels/openai";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { waitChannel } from "./channels/wait";
import { notionChannel } from "./channels/notion";
import { zoomChannel } from "./channels/zoom";
import { zohoCrmChannel } from "./channels/zoho-crm";
import { mcpClientChannel } from "./channels/mcp_client";
import { airtableChannel } from "./channels/airtable";
import { intercomChannel } from "./channels/intercom";
import { googleDriveChannel } from "./channels/google-drive";
import { googleSheetsChannel } from "./channels/google_sheets";
import { googleCalendarChannel } from "./channels/google_calendar";
import { mcpClientToolChannel } from "./channels/mcp_client_tool";
import { cronTriggerChannel } from "./channels/cron-trigger";
import { hubspotTriggerChannel } from "./channels/hubspot-trigger";
import { jiraChannel } from "./channels/jira";
import { telegramChannel } from "./channels/telegram";
import { pineconeChannel } from "./channels/pinecone";
import { mcpTriggerChannel } from "./channels/mcp-trigger";
import { telegramTriggerChannel } from "./channels/telegram-trigger";
import { airbnbChannel } from "./channels/airbnb";
import { expediaChannel } from "./channels/expedia";
import { razorpayChannel } from "./channels/razorpay";


export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, step }) => {
      // Get the current execution to preserve executedNodes
      const currentExecution = await prisma.execution.findUnique({
        where: { inngestEventId: event.data.event.id },
      });
      
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
          completedAt: new Date(),
          // Preserve executedNodes if they exist
          ...(currentExecution?.executedNodes && {
            executedNodes: currentExecution.executedNodes,
          }),
        },
      });
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      webhookTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      waitChannel(),
      notionChannel(),
      zoomChannel(),
      zohoCrmChannel(),
      mcpClientChannel(),
      airtableChannel(),
      intercomChannel(),
      googleDriveChannel(),
      googleSheetsChannel(),
      googleCalendarChannel(),
      mcpClientToolChannel(),
      cronTriggerChannel(),
      hubspotTriggerChannel(),
      jiraChannel(),
      telegramChannel(),
      pineconeChannel(),
      mcpTriggerChannel(),
      telegramTriggerChannel(),
      airbnbChannel(),
      expediaChannel(),
      razorpayChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or workflow ID is missing");
    }

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      return { workflow, nodes: topologicalSort(workflow.nodes, workflow.connections) };
    });

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          workflowName: sortedNodes.workflow.name,
          userId: sortedNodes.workflow.userId,
          inngestEventId,
        },
      });
    });

    // Save planned nodes for better UX
    await step.run("save-planned-nodes", async () => {
      const plannedNodes = sortedNodes.nodes.map(node => {
        // For AGENT nodes, get agentType from node.agentType OR node.data.agentType
        const agentType = node.agentType || (node.data as any)?.agentType || null;
        console.log(`📌 Node: ${node.name} | Type: ${node.type} | AgentType: ${agentType || 'null'}`);
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          agentType: agentType,
        };
      });
      
      console.log('📋 Planned nodes with agent types:', JSON.stringify(plannedNodes, null, 2));

      return prisma.execution.update({
        where: { inngestEventId },
        data: { plannedNodes },
      });
    });

    const userId = sortedNodes.workflow.userId;

    // Initialize context with any initial data from the trigger
    let context = event.data.initialData || {};
    const executedNodes: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      agentType?: string;
      executedAt: string;
      tokens: number;
    }> = [];

    // LLM node types that may return token usage
    const llmNodeTypes: NodeType[] = [NodeType.OPENAI, NodeType.ANTHROPIC, NodeType.GEMINI];
    
    // Agent nodes that track token usage
    const agentNodeType: NodeType = NodeType.AGENT;

    // Execute each node
    for (const node of sortedNodes.nodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });
      
      // Extract token usage from LLM responses or agent processing, default to 1000
      let tokens = 1000;
      if (llmNodeTypes.includes(node.type as NodeType)) {
        // Try to extract tokens from the response
        // Check for usage.totalTokens (Gemini format)
        if (context?.usage?.totalTokens) {
          tokens = context.usage.totalTokens;
        } 
        // Check for usage.total_tokens (OpenAI format)
        else if (context?.usage?.total_tokens) {
          tokens = context.usage.total_tokens;
        }
        // Check for steps array (AI SDK format)
        else if (context?.steps && Array.isArray(context.steps) && context.steps.length > 0) {
          const lastStep = context.steps[context.steps.length - 1];
          if (lastStep?.usage?.totalTokens) {
            tokens = lastStep.usage.totalTokens;
          }
        }
        // Check for direct tokenUsage property
        else if (context?.tokenUsage) {
          tokens = context.tokenUsage;
        }
        
        // Add 80% markup for LLM costs to charge customers
        tokens = Math.round(tokens * 1.8);
      } else if (node.type === agentNodeType) {
        // Agent nodes: extract token usage from steps or agentTokens
        if (context?.steps && Array.isArray(context.steps) && context.steps.length > 0) {
          // Sum up tokens from all LLM calls made by the agent
          let totalTokens = 0;
          for (const step of context.steps) {
            if (step?.usage?.totalTokens) {
              totalTokens += step.usage.totalTokens;
            }
          }
          if (totalTokens > 0) {
            tokens = totalTokens;
          }
        } else if (context?.agentTokens) {
          // For agents without LLM usage (e.g., ingestion), use agentTokens
          tokens = context.agentTokens;
        }
        
        // Add 80% markup for agent costs to charge customers
        tokens = Math.round(tokens * 1.8);
      }
      
      // Track this node execution
      const agentType = node.agentType || (node.data as any)?.agentType || undefined;
      executedNodes.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        agentType: agentType,
        executedAt: new Date().toISOString(),
        tokens,
      });
      
      console.log(`✅ Executed node: ${node.name} (${node.type}${agentType ? ` - ${agentType}` : ''}) - ${tokens} tokens`);

      // Update execution in real-time to show progress
      await step.run(`track-node-${node.id}`, async () => {
        return prisma.execution.update({
          where: { inngestEventId, workflowId },
          data: {
            executedNodes: [...executedNodes],
          },
        });
      });
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
          executedNodes,
        },
      })
    });

    return {
      workflowId,
      result: context,
    };
  },
);
