import { InitialNode } from "@/components/initial-node";
import { NodeType } from "../generated/prisma";
import type { NodeTypes } from "@xyflow/react";

import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { OpenAiNode } from "@/features/executions/components/openai/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { SendgridNode } from "@/features/executions/components/sendgrid/node";
import { Smtp2goNode } from "@/features/executions/components/smtp2go/node";
import { WebhookTrigger } from "@/features/triggers/components/webhook-trigger/node";
import { WaitNode } from "@/features/executions/components/wait/node";
import { AgentNode } from "@/features/executions/components/agent/agent-node";
import { NotionNode } from "@/features/executions/components/notion/node";
import { HubSpotNode } from "@/features/executions/components/hubspot/node";
import { CalendlyNode } from "@/features/executions/components/calendly/node";
import { ShopifyNode } from "@/features/executions/components/shopify/node";
import { ZendeskNode } from "@/features/executions/components/zendesk/node";
import { ZoomNode } from "@/features/executions/components/zoom/node";
import { ZohoNode } from "@/features/executions/components/zoho-crm/node";
import { McpClientNode } from "@/features/executions/components/mcp_client/node";
import { AirtableNode } from "@/features/executions/components/airtable/node";
import { IntercomNode } from "@/features/executions/components/intercom/node";
import { GoogleDriveNode } from "@/features/executions/components/google_drive/node";
import { GoogleSheetsNode } from "@/features/executions/components/google_sheets/node";
import { GoogleCalendarNode } from "@/features/executions/components/google_calendar/node";
import { McpClientToolNode } from "@/features/executions/components/mcp_client_tool/node";
import { CronTriggerNode } from "@/features/triggers/components/cron-trigger/node";
import { HubspotTriggerNode } from "@/features/triggers/components/hubspot-trigger/node";
import { JiraNode } from "@/features/executions/components/jira/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { PineconeNode } from "@/features/executions/components/pinecone/node";
import { McpTriggerNode } from "@/features/triggers/components/mcp-trigger/node";
import { TelegramTriggerNode } from "@/features/triggers/components/telegram-trigger/node";
import { AirbnbNode } from "@/features/executions/components/airbnb/node";
import { ExpediaNode } from "@/features/executions/components/expedia/node";
import { RazorpayNode } from "@/features/executions/components/razorpay/node";



export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.SENDGRID]: SendgridNode,
  [NodeType.SMTP2GO]: Smtp2goNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTrigger,
  [NodeType.WAIT]: WaitNode,
  [NodeType.AGENT]: AgentNode,
  [NodeType.NOTION]: NotionNode,
  [NodeType.HUBSPOT]: HubSpotNode,
  [NodeType.CALENDLY]: CalendlyNode,
  [NodeType.SHOPIFY]: ShopifyNode,
  [NodeType.ZENDESK]: ZendeskNode,
  [NodeType.ZOOM]: ZoomNode,
  [NodeType.ZOHO_CRM]: ZohoNode,
  [NodeType.MCP_CLIENT]: McpClientNode,
  [NodeType.AIRTABLE]: AirtableNode,
  [NodeType.INTERCOM]: IntercomNode,
  [NodeType.GOOGLE_DRIVE]: GoogleDriveNode,
  [NodeType.GOOGLE_SHEETS]: GoogleSheetsNode,
  [NodeType.GOOGLE_CALENDAR]: GoogleCalendarNode,
  [NodeType.MCP_CLIENT_TOOL]: McpClientToolNode,
  [NodeType.CRON_TRIGGER]: CronTriggerNode,
  [NodeType.HUBSPOT_TRIGGER]: HubspotTriggerNode,
  [NodeType.JIRA]: JiraNode,
  [NodeType.TELEGRAM]: TelegramNode,
  [NodeType.PINECONE]: PineconeNode,
  [NodeType.MCP_TRIGGER]: McpTriggerNode,
  [NodeType.TELEGRAM_TRIGGER]: TelegramTriggerNode,
  [NodeType.AIRBNB]: AirbnbNode,
  [NodeType.EXPEDIA]: ExpediaNode,
  [NodeType.RAZORPAY]: RazorpayNode,

} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
