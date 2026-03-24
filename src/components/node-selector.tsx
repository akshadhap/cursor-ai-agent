"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import {
  Bot,
  BotIcon,
  Clock,
  GlobeIcon,
  MousePointerIcon,
  Webhook,
  Search,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NodeType, AgentType } from "../generated/prisma";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { useTheme } from "next-themes";



const OpenAiLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/openai-white.svg"   // dark-mode version
      : "/logos/openai.svg"; // light-mode version

  return (
    <img
      src={src}
      alt="OpenAI"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const ZendeskLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/zendesk-white.svg"   // dark-mode version
      : "/logos/zendesk.svg"; // light-mode version

  return (
    <img
      src={src}
      alt="Zendesk"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const IntercomLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/intercom-white.svg"   // dark-mode version
      : "/logos/intercom.svg"; // light-mode version

  return (
    <img
      src={src}
      alt="Intercom"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const McpClientToolLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/mcp-client-tool.svg"   // light logo for dark background
      : "/logos/mcp-client-tool-dark.svg"; // dark logo for light background

  return (
    <img
      src={src}
      alt="MCP Client Tool"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const PineconeLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/pinecone-white.svg"
      : "/logos/pinecone.svg";

  return (
    <img
      src={src}
      alt="Pinecone"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const McpTriggerLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/mcp-client.png"   // white logo for dark-mode
      : "/logos/mcp-client-black.png"; // black logo for light-mode

  return (
    <img
      src={src}
      alt="MCP Trigger"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const McpClientLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/mcp-client.png"   // white logo for dark-mode
      : "/logos/mcp-client-black.png"; // black logo for light-mode

  return (
    <img
      src={src}
      alt="MCP Client"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

const ExpediaLogo: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const src =
    currentTheme === "dark"
      ? "/logos/expedia-white.svg"
      : "/logos/expedia.svg";

  return (
    <img
      src={src}
      alt="Expedia"
      className={`size-5 object-contain rounded-sm ${className ?? ""}`}
    />
  );
};

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
  agentType?: AgentType;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger manually",
    description: "Runs the flow on clicking a button. Good for getting started quickly",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form",
    description: "Runs the flow when a Google Form is submitted",
    icon: "/logos/googleform.svg",
  },
  {
    type: NodeType.STRIPE_TRIGGER,
    label: "Stripe Event",
    description: "Runs the flow when a Stripe Event is captured",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.WEBHOOK_TRIGGER,                   // 👈 NEW
    label: "Webhook",
    description: "Runs the flow when an external frontend calls this URL",
    icon: Webhook,
  },
  {
    type: NodeType.CRON_TRIGGER,
    label: "Cron Schedule",
    description: "Runs the flow automatically on a schedule (cron expression)",
    icon: Clock,
  },
  {
    type: NodeType.HUBSPOT_TRIGGER,
    label: "HubSpot Event",
    description: "Runs when a HubSpot event occurs (contact, company, deal, ticket)",
    icon: "/logos/hubspot.svg",
  },
  {
    type: NodeType.MCP_TRIGGER,
    label: "MCP Event",
    description: "Runs when an MCP server sends an event via webhook",
    icon: McpTriggerLogo,
  },
  {
    type: NodeType.TELEGRAM_TRIGGER,
    label: "Telegram Bot",
    description: "Runs when your Telegram bot receives updates",
    icon: "/logos/telegram.svg",
  },
];


const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request",
    icon: GlobeIcon,
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Uses Google Gemini to generate text",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Uses OpenAI to generate text",
    icon: OpenAiLogo,
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic",
    description: "Uses Anthropic to generate text",
    icon: "/logos/anthropic.svg",
  },
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Send a message to Discord",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.SLACK,
    label: "Slack",
    description: "Send a message to Slack",
    icon: "/logos/slack.svg",
  },
  {
    type: NodeType.SENDGRID,
    label: "SendGrid Email",
    description: "Send an email via SendGrid",
    icon: "/logos/sendgrid.png", // or any icon you want
  },
  {
    type: NodeType.SMTP2GO,
    label: "SMTP2GO Email",
    description: "Send an email via SMTP2GO",
    icon: "/logos/smtp2go.svg", // or whichever icon
  },
  {
    type: NodeType.WAIT,
    label: "Wait",
    description: "Wait for a specified amount of time",
    icon: Clock,
  },
  {
    type: NodeType.NOTION,
    label: "Notion",
    description: "Create or update pages, databases, and blocks in Notion",
    icon: "/logos/notion.svg",
  },
  {
    type: NodeType.HUBSPOT,
    label: "HubSpot",
    description: "Manage contacts, companies, deals, and tickets in HubSpot CRM",
    icon: "/logos/hubspot.svg",
  },
  {
    type: NodeType.CALENDLY,
    label: "Calendly",
    description: "Schedule meetings, manage events, and handle invitees",
    icon: "/logos/calendly.svg",
  },
  {
    type: NodeType.SHOPIFY,
    label: "Shopify",
    description: "Create and manage products, orders, and customers in Shopify",
    icon: "/logos/shopify.svg",
  },
  {
    type: NodeType.ZENDESK,
    label: "Zendesk",
    description: "Create or update tickets in Zendesk",
    icon: ZendeskLogo,
  },
  {
    type: NodeType.ZOOM,
    label: "Zoom",
    description: "Create meetings and manage participants in Zoom",
    icon: "/logos/zoom.svg",
  },
  {
    type: NodeType.ZOHO_CRM,
    label: "Zoho CRM",
    description: "Manage leads, contacts, deals, and accounts in Zoho CRM",
    icon: "/logos/zoho-crm.svg",
  },
  {
    type: NodeType.MCP_CLIENT,
    label: "MCP Client",
    description: "Connect to MCP servers and call tools",
    icon: McpClientLogo,
  },
  {
    type: NodeType.AIRTABLE,
    label: "Airtable",
    description: "Create, update, and retrieve records from Airtable bases",
    icon: "/logos/airtable.svg",
  },
  {
    type: NodeType.INTERCOM,
    label: "Intercom",
    description: "Manage Intercom users, conversations, and messages",
    icon: IntercomLogo,
  },
  {
    type: NodeType.GOOGLE_DRIVE,
    label: "Google Drive",
    description: "Manage files and folders in Google Drive",
    icon: "/logos/google-drive.svg",
  },
  {
    type: NodeType.GOOGLE_SHEETS,
    label: "Google Sheets",
    description: "Read, write, and manage spreadsheet data",
    icon: "/logos/google-sheets.svg",
  },
  {
    type: NodeType.GOOGLE_CALENDAR,
    label: "Google Calendar",
    description: "Manage calendar events and schedules",
    icon: "/logos/google-calendar.svg",
  },
  {
    type: NodeType.MCP_CLIENT_TOOL,
    label: "MCP Client Tool",
    description: "Execute MCP protocol tools and integrations",
    icon: McpClientToolLogo,
  },
  {
    type: NodeType.JIRA,
    label: "Jira",
    description: "Manage Jira issues, projects, and workflows",
    icon: "/logos/jira.svg",
  },
  {
    type: NodeType.TELEGRAM,
    label: "Telegram",
    description: "Send messages and interact with Telegram bots",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.PINECONE,
    label: "Pinecone",
    description: "Vector database for similarity search and RAG",
    icon: PineconeLogo,
  },
  {
    type: NodeType.AIRBNB,
    label: "Airbnb",
    description: "Manage listings, reservations, and availability",
    icon: "/logos/airbnb.svg",
  },
  {
    type: NodeType.EXPEDIA,
    label: "Expedia",
    description: "Search hotels, check availability, pricing, and bookings",
    icon: ExpediaLogo,
  },
  {
    type: NodeType.RAZORPAY,
    label: "Razorpay",
    description: "Accept payments, create orders, and manage refunds",
    icon: "/logos/razorpay.png",
  },
];

// Dummy lead agents for non-dev mode
type LeadAgentOption = NodeTypeOption & { id: string };

// Dummy lead agents for non-dev mode

const leadAgents: LeadAgentOption[] = [
  {
    id: "ingestion",
    type: NodeType.AGENT,
    agentType: AgentType.LEAD_INGESTION,
    label: "Ingestion",
    description:
      "Collects leads from forms, CRMs, and webhooks into one place.",
    icon: BotIcon,
  },
  {
    id: "qualifier",
    type: NodeType.AGENT,
    agentType: AgentType.LEAD_QUALIFIER,
    label: "Qualifier",
    description:
      "Scores and qualifies leads based on fit, intent, and past interactions.",
    icon: BotIcon,
  },
  {
    id: "prioritizer",
    type: NodeType.AGENT,
    agentType: AgentType.LEAD_PRIORITIZER,
    label: "Prioritizer",
    description:
      "Ranks leads so sales teams know who to talk to first.",
    icon: BotIcon,
  },
  {
    id: "cold-outreach",
    type: NodeType.AGENT,
    agentType: AgentType.LEAD_COLD_OUTREACH,
    label: "Cold Outreach",
    description:
      "Drafts and sends cold outreach emails based on your product and persona.",
    icon: BotIcon,
  },
  {
    id: "followup",
    type: NodeType.AGENT,
    agentType: AgentType.LEAD_FOLLOWUP,
    label: "Followup",
    description:
      "Schedules and sends follow-up emails to keep leads warm automatically.",
    icon: BotIcon,
  },
];




interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  isDeveloperMode: boolean;  // 👈 make it required here
}

export function NodeSelector({
  open,
  onOpenChange,
  children,
  isDeveloperMode,
}: NodeSelectorProps) {

  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState("");

  const handleNodeSelect = useCallback((selection: NodeTypeOption) => {
    // Check if trying to add a manual trigger when one already exists
    if (selection.type === NodeType.MANUAL_TRIGGER) {
      const nodes = getNodes();
      const hasManualTrigger = nodes.some(
        (node) => node.type === NodeType.MANUAL_TRIGGER,
      );

      if (hasManualTrigger) {
        toast.error("Only one manual trigger is allowed per workflow");
        return;
      }
    }

    setNodes((nodes) => {
      const hasInitialTrigger = nodes.some(
        (node) => node.type === NodeType.INITIAL,
      );

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const flowPosition = screenToFlowPosition({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
      });

      const newNode = {
        id: createId(),
        type: selection.type,
        position: flowPosition,
        data: {
          // helpful metadata for the node itself
          label: selection.label,
          description: selection.description,
        },
        // for AGENT nodes, set agentType at the top level
        ...(selection.agentType ? { agentType: selection.agentType } : {}),
      };


      if (hasInitialTrigger) {
        return [newNode];
      }

      return [...nodes, newNode];
    });

    onOpenChange(false);
  }, [
    setNodes,
    getNodes,
    onOpenChange,
    screenToFlowPosition,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isDeveloperMode
              ? "What triggers this workflow?"
              : "Pick an agent to run this workflow"}
          </SheetTitle>
          <SheetDescription>
            {isDeveloperMode
              ? "A trigger is a step that starts your workflow."
              : "Use pre-built agents to handle lead ingestion, qualification, prioritization, outreach, and follow-up."}
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4 mb-4 px-4">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isDeveloperMode ? (
          <>
            {/* DEV MODE: triggers + execution nodes */}
            <div>
              {triggerNodes
                .filter((node) =>
                  searchQuery === ""
                    ? true
                    : node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((nodeType) => {
                  const Icon = nodeType.icon;

                  return (
                    <div
                      key={nodeType.type}
                      className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                      onClick={() => handleNodeSelect(nodeType)}
                    >
                      <div className="flex items-center gap-6 w-full overflow-hidden">
                        {typeof Icon === "string" ? (
                          <img
                            src={Icon}
                            alt={nodeType.label}
                            className="size-5 object-contain rounded-sm"
                          />
                        ) : (
                          <Icon className="size-5" />
                        )}
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium text-sm">
                            {nodeType.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {nodeType.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <Separator className="my-2" />

            <div>
              {executionNodes
                .filter((node) =>
                  searchQuery === ""
                    ? true
                    : node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((nodeType) => {
                  const Icon = nodeType.icon;

                  return (
                    <div
                      key={nodeType.type}
                      className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                      onClick={() => handleNodeSelect(nodeType)}
                    >
                      <div className="flex items-center gap-6 w-full overflow-hidden">
                        {typeof Icon === "string" ? (
                          <img
                            src={Icon}
                            alt={nodeType.label}
                            className="size-5 object-contain rounded-sm"
                          />
                        ) : (
                          <Icon className="size-5" />
                        )}
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium text-sm">
                            {nodeType.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {nodeType.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <>


            <div>
              {leadAgents
                .filter((agent) =>
                  searchQuery === ""
                    ? true
                    : agent.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((agent) => {
                  const Icon = agent.icon;

                  return (
                    <div
                      key={agent.id}
                      className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                      onClick={() => handleNodeSelect(agent)}
                    >
                      <div className="flex items-center gap-6 w-full overflow-hidden">
                        {typeof Icon === "string" ? (
                          <img
                            src={Icon}
                            alt={agent.label}
                            className="size-5 object-contain rounded-sm"
                          />
                        ) : (
                          <Icon className="size-5" />
                        )}
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium text-sm">
                            {agent.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {agent.description}
                          </span>
                          <span className="mt-1 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-medium">
                            Lead agent
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

