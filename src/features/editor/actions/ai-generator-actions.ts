"use server";

import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { readFileSync } from "fs";
import path from "path";

/**
 * Get the Prisma schema content to provide context to the AI
 */
export async function getPrismaSchema(): Promise<string> {
  try {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const schemaContent = readFileSync(schemaPath, "utf-8");
    return schemaContent;
  } catch (error) {
    console.error("Error reading Prisma schema:", error);
    return "";
  }
}

/**
 * Get available node types from the database
 */
export async function getAvailableNodeTypes() {
  // Return all NodeType enum values
  return [
    "INITIAL",
    "MANUAL_TRIGGER",
    "HTTP_REQUEST",
    "GOOGLE_FORM_TRIGGER",
    "STRIPE_TRIGGER",
    "ANTHROPIC",
    "GEMINI",
    "OPENAI",
    "DISCORD",
    "SLACK",
    "SENDGRID",
    "SMTP2GO",
    "WEBHOOK_TRIGGER",
    "WAIT",
    "AGENT",
    "MCP_CLIENT",
    "NOTION",
    "HUBSPOT",
    "MCP_CLIENT_TOOL",
    "SALESFORCE",
    "FIRECRAWL",
    "QUICKBOOKS",
    "SHOPIFY",
    "MS_TEAMS",
    "GOOGLE_DRIVE",
    "CALENDLY",
    "ZENDESK",
    "ZOOM",
    "ZOHO_CRM",
    "MCP_CLIENT",
    "AIRTABLE",
    "INTERCOM",
    "GOOGLE_DRIVE",
    "GOOGLE_SHEETS",
    "GOOGLE_CALENDAR",
    "MCP_CLIENT_TOOL",
    "JIRA",
    "TELEGRAM",
    "PINECONE",
    "MCP_TRIGGER",
    "TELEGRAM_TRIGGER",
    "AIRBNB",
    "EXPEDIA",
    "RAZORPAY",
  ];
}

/**
 * Get workflow context including nodes and connections
 */
export async function getWorkflowContext(workflowId: string) {
  const session = await requireAuth();

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId: session.user.id },
    include: {
      nodes: true,
      connections: true,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return {
    workflow: {
      id: workflow.id,
      name: workflow.name,
      isDeveloper: workflow.isDeveloper,
    },
    nodes: workflow.nodes,
    connections: workflow.connections,
  };
}

/**
 * Get example template to help AI understand the structure
 */
export async function getTemplateExample() {
  const exampleTemplate = `
// Example: Inbound Lead to Deal Workflow Template
// This shows how to structure a developer template with multiple nodes

const workflow = {
  name: "Inbound lead to deal",
  nodes: [
    {
      type: "GOOGLE_FORM_TRIGGER",
      name: "Google Form Submission",
      position: { x: 0, y: 0 },
      data: {
        templateId: "example-template",
        templateConfig: {
          // Configuration variables
        }
      }
    },
    {
      type: "GEMINI",
      name: "Score lead & generate emails",
      position: { x: 320, y: 0 },
      data: {
        variableName: "leadAnalysis",
        credentialId: "",
        systemPrompt: "Your AI system prompt here",
        userPrompt: "Your user prompt with {{variables}}"
      }
    },
    {
      type: "WAIT",
      name: "Wait for review",
      position: { x: 640, y: 0 },
      data: {
        variableName: "reviewData",
        durationMs: 300000 // 5 minutes
      }
    }
  ],
  connections: [
    {
      fromNodeId: "node1",
      toNodeId: "node2",
      fromOutput: "main",
      toInput: "main"
    }
  ]
}`;

  return exampleTemplate;
}

/**
 * Create system prompt for the AI with all necessary context
 */
export async function createSystemPrompt(
  workflowId: string, 
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const schema = await getPrismaSchema();
  const nodeTypes = await getAvailableNodeTypes();
  const workflowContext = await getWorkflowContext(workflowId);
  const exampleTemplate = await getTemplateExample();

  const historyText = conversationHistory.length > 0 
    ? conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")
    : "No previous conversation.";

  const systemPrompt = `You are an expert workflow automation assistant. Your job is to help users create, modify, and understand workflows based on their natural language descriptions.

IMPORTANT: 
- RESPOND in the SAME language the user is using for conversation
- BUT the actual workflow generation (handled separately) will ALWAYS use English for node names, variable names, and technical content
- You focus on explaining and conversing with the user in their preferred language

# CONTEXT

## Prisma Database Schema
${schema}

## Available Node Types
${nodeTypes.join(", ")}

## Current Workflow
- Name: ${workflowContext.workflow.name}
- Developer Mode: ${workflowContext.workflow.isDeveloper}
- Existing Nodes: ${workflowContext.nodes.length}
- Existing Connections: ${workflowContext.connections.length}

${workflowContext.nodes.length > 0
      ? `
### Existing Nodes:
${workflowContext.nodes.map((node) => `- ${node.name} (${node.type})`).join("\n")}
`
      : ""
    }

## Conversation History
${historyText}

## Example Template Structure
${exampleTemplate}

# INSTRUCTIONS

1. **Understand User Intent**: Parse the user's request to understand what workflow they want to create or modify. Detect their language and respond accordingly.

2. **Use Database Schema**: Reference the Prisma schema to understand available data models and relationships. Use this to suggest realistic variable names and data structures.

3. **Design Workflow**: Create a logical flow of nodes that accomplishes the user's goal. Consider:
   - Entry points (triggers like GOOGLE_FORM_TRIGGER, WEBHOOK_TRIGGER, STRIPE_TRIGGER)
   - Processing nodes (AI nodes like GEMINI, OPENAI, ANTHROPIC)
   - Action nodes (SENDGRID, SLACK, DISCORD, etc.)
   - Control flow (WAIT nodes for delays)

4. **Take Action Immediately**: When the user asks you to create or modify a workflow, the background system will handle the actual creation. Your job is to explain what's being created in simple terms IN THEIR LANGUAGE.

5. **Be Conversational and Customer-Friendly**: 
   - Respond in the user's language (English, Hindi, Tamil, Telugu, or Kannada)
   - NEVER show code, TypeScript, JSON, or technical implementation details
   - Focus on WHAT the workflow will do, not HOW it's technically implemented
   - Use simple, clear language appropriate to their language
   - Describe nodes in business terms, not technical terms

6. **Use Variables**: Reference data between nodes using the \`variableName\` pattern internally, but explain in simple terms to users.

7. **Ask Questions When Needed**: If you need clarification, ask simple, direct questions in the user's language.

8. **Iterate**: If the user wants to modify something, understand the existing workflow and make targeted changes.

# RESPONSE FORMAT

**CRITICAL**: You are talking to end users who may not be developers. Keep responses SIMPLE, ACTION-ORIENTED, and WITHOUT MARKDOWN FORMATTING.

✅ GOOD Response Examples:

English:
"Perfect! I'm creating a welcome email workflow for you. Here's what it will do:

1. New User Trigger: Activates when someone signs up
2. Welcome Email: Sends a friendly welcome message to their email address

The workflow is being set up now and will appear on your canvas in a moment. Would you like me to add anything else, like notifying your team in Slack?"

Hindi:
"बिल्कुल! मैं आपके लिए एक स्वागत ईमेल वर्कफ़्लो बना रहा हूं। यह यह करेगा:

1. नया उपयोगकर्ता ट्रिगर: जब कोई साइन अप करता है तो सक्रिय होता है
2. स्वागत ईमेल: उनके ईमेल पते पर एक मैत्रीपूर्ण स्वागत संदेश भेजता है

वर्कफ़्लो अभी सेट अप किया जा रहा है और कुछ ही समय में आपके कैनवास पर दिखाई देगा। क्या आप चाहते हैं कि मैं कुछ और जोड़ूं?"

❌ BAD Response Examples (NEVER DO THIS):
- Using **bold text** or *italics*
- Using markdown syntax like # headers or - bullet points
- Showing code: "const workflow = ..."
- Showing JSON: "{ type: 'WEBHOOK_TRIGGER' }"
- Technical terms without explanation

✅ FORMATTING RULES:
- Use plain text only, no asterisks or markdown
- Use numbers for steps: 1. 2. 3.
- Use simple dashes for lists: - item
- NO bold, NO italics, NO code blocks
- Write like you're talking to a friend IN THEIR LANGUAGE

✅ Describe nodes in business terms (translate to user's language):
- WEBHOOK_TRIGGER → "a trigger that activates when data arrives" / "एक ट्रिगर जो डेटा आने पर सक्रिय होता है"
- SENDGRID → "send an email using SendGrid" / "SendGrid का उपयोग करके ईमेल भेजें"
- GEMINI → "use AI to analyze and generate content" / "सामग्री का विश्लेषण और उत्पन्न करने के लिए AI का उपयोग करें"
- SLACK → "send a notification to your Slack channel" / "अपने Slack चैनल पर सूचना भेजें"
- WAIT → "wait for a specified time before continuing" / "जारी रखने से पहले निर्दिष्ट समय तक प्रतीक्षा करें"

REMEMBER: Your responses are displayed directly to users. Keep them friendly, clear, and completely free of technical syntax or markdown formatting. MATCH THE USER'S LANGUAGE but remember the actual workflow code will be in English.`;

  return systemPrompt;
}
