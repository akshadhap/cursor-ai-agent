import { NodeType, AgentType } from "@/generated/prisma";
import { NodeExecutor } from "../types";

import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { openAiExecutor } from "../components/openai/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { sendgridExecutor } from "../components/sendgrid/executor";
import { smtp2goExecutor } from "../components/smtp2go/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { waitExecutor } from "@/features/executions/components/wait/executor";
import { notionExecutor } from "../components/notion/executor";
import { hubspotExecutor } from "../components/hubspot/executor";
import { agentRegistry } from "@/features/executions/components/agent/agent-registry";
import { calendlyExecutor } from "../components/calendly/executor";
import { shopifyExecutor } from "../components/shopify/executor";
import { zendeskExecutor } from "../components/zendesk/executor";
import { zoomExecutor } from "../components/zoom/executor";
import { zohoExecutor } from "../components/zoho-crm/executor";
import { mcpClientExecutor } from "../components/mcp_client/executor";
import { airtableExecutor } from "../components/airtable/executor";
import { intercomExecutor } from "../components/intercom/executor";
import { googleDriveExecutor } from "../components/google_drive/executor";
import { googleSheetsExecutor } from "../components/google_sheets/executor";
import { googleCalendarExecutor } from "../components/google_calendar/executor";
import { mcpClientToolExecutor } from "../components/mcp_client_tool/executor";
import { cronTriggerExecutor } from "../../triggers/components/cron-trigger/executor";
import { hubspotTriggerExecutor } from "../../triggers/components/hubspot-trigger/executor";
import { jiraExecutor } from "../components/jira/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { pineconeExecutor } from "../components/pinecone/executor";
import { mcpTriggerExecutor } from "../../triggers/components/mcp-trigger/executor";
import { telegramTriggerExecutor } from "../../triggers/components/telegram-trigger/executor";
import { airbnbExecutor } from "../components/airbnb/executor";
import { expediaExecutor } from "../components/expedia/executor";
import { razorpayExecutor } from "../components/razorpay/executor";

// Placeholder executor for not-yet-implemented node types
const notImplementedExecutor: NodeExecutor = async (params) => {
  console.warn(`Executor not implemented for node type: ${params.data.type}`);
  return params.context;
};

export const executorRegistry: Record<NodeType, NodeExecutor<any>> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,

  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,

  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openAiExecutor,

  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,

  [NodeType.SENDGRID]: sendgridExecutor,
  [NodeType.SMTP2GO]: smtp2goExecutor,

  [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
  [NodeType.WAIT]: waitExecutor,
  [NodeType.NOTION]: notionExecutor,

  [NodeType.HUBSPOT]: hubspotExecutor as NodeExecutor,
  [NodeType.MCP_CLIENT]: mcpClientExecutor,

  [NodeType.SALESFORCE]: notImplementedExecutor,
  [NodeType.FIRECRAWL]: notImplementedExecutor,
  [NodeType.QUICKBOOKS]: notImplementedExecutor,
  [NodeType.SHOPIFY]: shopifyExecutor,
  [NodeType.MS_TEAMS]: notImplementedExecutor,
  [NodeType.CALENDLY]: calendlyExecutor,
  [NodeType.ZENDESK]: zendeskExecutor,
  [NodeType.ZOOM]: zoomExecutor,
  [NodeType.ZOHO_CRM]: zohoExecutor,
  [NodeType.AIRTABLE]: airtableExecutor,
  [NodeType.INTERCOM]: intercomExecutor,
  [NodeType.GOOGLE_DRIVE]: googleDriveExecutor,
  [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
  [NodeType.GOOGLE_CALENDAR]: googleCalendarExecutor,
  [NodeType.MCP_CLIENT_TOOL]: mcpClientToolExecutor,
  [NodeType.CRON_TRIGGER]: cronTriggerExecutor,
  [NodeType.HUBSPOT_TRIGGER]: hubspotTriggerExecutor,
  [NodeType.JIRA]: jiraExecutor,
  [NodeType.TELEGRAM]: telegramExecutor,
  [NodeType.PINECONE]: pineconeExecutor,
  [NodeType.MCP_TRIGGER]: mcpTriggerExecutor,
  [NodeType.TELEGRAM_TRIGGER]: telegramTriggerExecutor,
  [NodeType.AIRBNB]: airbnbExecutor,
  [NodeType.EXPEDIA]: expediaExecutor,
  [NodeType.RAZORPAY]: razorpayExecutor,

  [NodeType.AGENT]: async (params) => {
    const agentType = params.data.agentType as AgentType | undefined;

    if (!agentType) {
      // No agent type configured → no-op
      return params.context;
    }

    const exec = agentRegistry[agentType];

    if (!exec) {
      // Unknown agent type → no-op
      return params.context;
    }

    return exec(params); // run the correct sub-agent
  },
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
