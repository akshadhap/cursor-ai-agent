// src/app/(dashboard)/(rest)/templates/templates-client.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTemplates, useUseTemplate, useRemoveTemplate } from "@/features/templates/hooks/use-templates";
import { authClient } from "@/lib/auth-client";
import { TEMPLATE_TAGS } from "@/features/editor/components/save-to-community-button";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  WorkflowIcon,
  WebhookIcon,
  BotIcon,
  Code2Icon,
  Users2Icon,
  Trash2Icon,
  Loader2Icon,
  SparklesIcon,
  GlobeIcon,
  DatabaseIcon,
  MessageSquareIcon,
  CalendarIcon,
} from "lucide-react";


import { createDeveloperInboundLeadToDealWorkflow } from "./developer/inbound-lead-to-deal/actions";
import { createNonDeveloperInboundLeadToDealWorkflow } from "./non-developer/inbound-lead-to-deal/actions";

// ---------------- TEMPLATE METADATA ----------------

const NORMAL_TEMPLATES = [
  {
    id: "inbound-lead-to-deal",
    name: "Inbound lead to deal",
    tagline: "Turn inbound leads into qualified deals with AI and automated email follow-up.",
    description:
      "Capture leads from a webhook or webform, summarize the conversation with AI, qualify the lead, and send a personalized email using your email provider.",
    badges: ["Ingestion", "Qualifier", "Prioritizer", "Cold Outreach", "Followup"],
  },
];

const DEVELOPER_TEMPLATES = [
  {
    id: "inbound-lead-to-deal",
    name: "Inbound lead to deal",
    tagline: "Turn inbound leads into qualified deals with AI and automated email follow-up.",
    description: "Developer version with raw data access and debugging options.",
    badges: ["Webhook", "AI Summary", "Email", "Sales", "Dev"],
  },
];

// ---------------- ACTION REGISTRY ----------------

type TemplateAction = (templateId: string) => Promise<string | null | undefined>;

const templateActionRegistry = {
  "inbound-lead-to-deal": {
    dev: createDeveloperInboundLeadToDealWorkflow,
    nonDev: createNonDeveloperInboundLeadToDealWorkflow,
  },
} as const;

type TemplateId = keyof typeof templateActionRegistry;

// ---------------- COMMUNITY: Integrations helpers ----------------

type TemplateNodeJSON = {
  id?: string;
  type?: string; // NodeType enum value
  name?: string;
  data?: any;
};

const getIntegrationsFromTemplateNodes = (template: any): string[] => {
  const nodes = template?.nodes;

  // nodes can be stored as array OR as { nodes: [...] } depending on how you saved it
  const nodeArray: TemplateNodeJSON[] = Array.isArray(nodes)
    ? nodes
    : Array.isArray(nodes?.nodes)
      ? nodes.nodes
      : [];

  if (!nodeArray.length) return [];

  const types = nodeArray
    .map((n) => (n?.type ? String(n.type).toUpperCase() : ""))
    .filter(Boolean);

  return Array.from(new Set(types));
};

// Integration icon component that handles both SVG paths and Lucide icons
const IntegrationIcon = ({ src, fallbackIcon: FallbackIcon, alt, className }: {
  src?: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  alt: string;
  className?: string;
}) => {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }
  if (FallbackIcon) {
    return <FallbackIcon className={className} />;
  }
  return <WorkflowIcon className={className} />;
};

const INTEGRATION_META: Record<
  string,
  { label: string; icon?: string; fallbackIcon?: React.ComponentType<{ className?: string }> }
> = {
  WEBHOOK_TRIGGER: { label: "Webhook", fallbackIcon: WebhookIcon },
  HTTP_REQUEST: { label: "HTTP", fallbackIcon: GlobeIcon },
  MANUAL_TRIGGER: { label: "Manual", fallbackIcon: WorkflowIcon },

  OPENAI: { label: "OpenAI", icon: "/logos/openai.svg" },
  ANTHROPIC: { label: "Anthropic", icon: "/logos/anthropic.svg" },
  GEMINI: { label: "Gemini", icon: "/logos/gemini.svg" },
  AGENT: { label: "Agent", fallbackIcon: BotIcon },

  SLACK: { label: "Slack", icon: "/logos/slack.svg" },
  DISCORD: { label: "Discord", icon: "/logos/discord.svg" },

  NOTION: { label: "Notion", icon: "/logos/notion.svg" },
  HUBSPOT: { label: "HubSpot", fallbackIcon: DatabaseIcon },
  SALESFORCE: { label: "Salesforce", fallbackIcon: DatabaseIcon },
  STRIPE_TRIGGER: { label: "Stripe", icon: "/logos/stripe.svg" },
  GOOGLE_FORM_TRIGGER: { label: "Google Form", icon: "/logos/googleform.svg" },

  GOOGLE_DRIVE: { label: "Google Drive", icon: "/logos/google-drive.svg" },
  GOOGLE_SHEETS: { label: "Google Sheets", icon: "/logos/google-sheets.svg" },
  GOOGLE_CALENDAR: { label: "Google Calendar", icon: "/logos/google-calendar.svg" },
  MCP_CLIENT_TOOL: { label: "MCP Client Tool", icon: "/logos/mcp-client-tool.svg" },
  CALENDLY: { label: "Calendly", fallbackIcon: CalendarIcon },

  SENDGRID: { label: "SendGrid", icon: "/logos/sendgrid.png" },
  SMTP2GO: { label: "SMTP", icon: "/logos/smtp2go.svg" },

  FIRECRAWL: { label: "Firecrawl", fallbackIcon: GlobeIcon },
  SHOPIFY: { label: "Shopify", fallbackIcon: DatabaseIcon },
  QUICKBOOKS: { label: "QuickBooks", fallbackIcon: DatabaseIcon },
  ZENDESK: { label: "Zendesk", fallbackIcon: MessageSquareIcon },
  ZOOM: { label: "Zoom", icon: "/logos/zoom.svg" },
  ZOHO_CRM: { label: "Zoho CRM", icon: "/logos/zoho-crm.svg" },
  MCP_CLIENT: { label: "MCP Client", icon: "/logos/mcp-client.png" },
  AIRTABLE: { label: "Airtable", icon: "/logos/airtable.svg" },
  INTERCOM: { label: "Intercom", icon: "/logos/intercom.svg" },
  MS_TEAMS: { label: "MS Teams", fallbackIcon: MessageSquareIcon },
  WAIT: { label: "Wait", fallbackIcon: CalendarIcon },
  JIRA: { label: "Jira", icon: "/logos/jira.svg" },
  TELEGRAM: { label: "Telegram", icon: "/logos/telegram.svg" },
  PINECONE: { label: "Pinecone", icon: "/logos/pinecone.svg" },
  MCP_TRIGGER: { label: "MCP Trigger", icon: "/logos/mcp-client-tool.svg" },
  TELEGRAM_TRIGGER: { label: "Telegram Trigger", icon: "/logos/telegram.svg" },
  AIRBNB: { label: "Airbnb", icon: "/logos/airbnb.svg" },
  EXPEDIA: { label: "Expedia", icon: "/logos/expedia.svg" },
  RAZORPAY: { label: "Razorpay", icon: "/logos/razorpay.png" },
};

// ---------------- SMALL UI HELPERS ----------------

const TemplateSkeletonGrid = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="border border-border/60">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              <div className="h-5 w-14 bg-muted rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const TemplatesClient = () => {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // track which template is being created (per-button UX)
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const { data: session } = authClient.useSession();

  const { data: communityTemplates, isLoading: isLoadingTemplates } = useTemplates();
  const useTemplateMutation = useUseTemplate();
  const removeTemplateMutation = useRemoveTemplate();

  const templates = isDeveloperMode ? DEVELOPER_TEMPLATES : NORMAL_TEMPLATES;

  const filteredTemplates = useMemo(() => {
    if (!communityTemplates) return [];
    if (selectedFilterTags.length === 0) return communityTemplates;

    return communityTemplates.filter((template) => {
      const templateTags = template.tags || [];
      return selectedFilterTags.every((tag) => templateTags.includes(tag));
    });
  }, [communityTemplates, selectedFilterTags]);

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const guardSubscription = () => {
    return true;
  };

  const handleUseTemplate = (templateId: string) => {
    if (!guardSubscription()) return;

    setCreatingTemplateId(templateId);

    startTransition(async () => {
      try {
        const config = templateActionRegistry[templateId as TemplateId];
        if (!config) return;

        const action = isDeveloperMode ? config.dev ?? config.nonDev : config.nonDev ?? config.dev;
        if (!action) return;

        const workflowId = await action(templateId);
        if (!workflowId) return;

        const mode = isDeveloperMode ? "dev" : "nondev";
        router.push(`/workflows/${workflowId}?mode=${mode}`);
      } catch {
        toast.error("Failed to create workflow from template.");
      } finally {
        setCreatingTemplateId(null);
      }
    });
  };

  const handleUseCommunityTemplate = async (templateId: string) => {
    if (!guardSubscription()) return;

    setCreatingTemplateId(templateId);

    try {
      const workflow = await useTemplateMutation.mutateAsync({ templateId });
      toast.success("Template added to your workflows!");
      router.push(`/workflows/${workflow.id}`);
    } catch {
      toast.error("Failed to use template");
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await removeTemplateMutation.mutateAsync({ id: templateId });
      toast.success("Template deleted successfully");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const creatingAny =
    isPending || useTemplateMutation.isPending || creatingTemplateId !== null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <WorkflowIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          </div>

          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Start quickly with pre-built workflows or browse community templates.
          </p>

        </div>

        {/* Developer mode toggle */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Code2Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="leading-tight">
              <Label htmlFor="developer-mode" className="text-sm font-medium cursor-pointer">
                Developer Mode
              </Label>
              <div className="text-xs text-muted-foreground">
                {isDeveloperMode ? "Advanced workflows & raw data access" : "Guided setup for faster onboarding"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Off</span>
            <Switch
              id="developer-mode"
              checked={isDeveloperMode}
              onCheckedChange={(v) => {
                setIsDeveloperMode(v);
                setSelectedFilterTags([]); // optional UX: reset filters when switching modes
              }}
              className="scale-110"
              disabled={creatingAny}
            />
            <span className="text-xs text-muted-foreground">On</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="official" className="w-full">

        {/* Official */}
        <TabsContent value="official" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const isCreatingThis = creatingTemplateId === template.id && (isPending || creatingAny);
              return (
                <Card
                  key={template.id}
                  className="border border-border/60 hover:border-primary/50 transition-colors flex flex-col overflow-hidden"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
                          <WebhookIcon className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      </div>

                      <Badge variant="secondary" className="text-[10px]">
                        {isDeveloperMode ? "Developer" : "Guided"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{template.tagline}</p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {template.badges.map((badge) => (
                        <Badge key={badge} variant="outline" className="text-[11px] px-2 py-0">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">{template.description}</p>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <BotIcon className="w-3 h-3" />
                        <span>{isDeveloperMode ? "Raw data + debugging options" : "Webhook + AI + email follow-up"}</span>
                      </div>

                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={creatingAny}
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        {isCreatingThis ? (
                          <>
                            <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          "Use template"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Community (Developer mode only) */}
        {isDeveloperMode && (
          <TabsContent value="community" className="mt-6 space-y-4">
            {/* Filters */}
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Filter by Tags</Label>

                {selectedFilterTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSelectedFilterTags([])}
                    disabled={creatingAny}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATE_TAGS.map((tag) => {
                  const isSelected = selectedFilterTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover:scale-105 transition-transform select-none"
                      onClick={() => !creatingAny && toggleFilterTag(tag)}
                    >
                      {tag}
                      {isSelected && " ✓"}
                    </Badge>
                  );
                })}
              </div>

              {selectedFilterTags.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing templates with: <span className="text-foreground">{selectedFilterTags.join(", ")}</span>
                </p>
              )}
            </div>

            {/* Body */}
            {isLoadingTemplates ? (
              <TemplateSkeletonGrid />
            ) : filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template) => {
                  const isCreatingThis = creatingTemplateId === template.id && useTemplateMutation.isPending;
                  const integrations = getIntegrationsFromTemplateNodes(template).slice(0, 8);

                  return (
                    <Card
                      key={template.id}
                      className="group border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden bg-linear-to-br from-card to-card/50"
                    >
                      <CardHeader className="space-y-4 pb-4">
                        {/* Header with gradient background */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 shrink-0 ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all">
                              <SparklesIcon className="w-5 h-5 text-primary" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                                {template.name}
                              </CardTitle>

                              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                                <span className="text-muted-foreground">
                                  By{" "}
                                  <span className="font-medium text-foreground/90">
                                    {template.createdBy?.name ?? "Unknown"}
                                  </span>
                                </span>
                                <span className="text-muted-foreground/50">•</span>
                                <div className="flex items-center gap-1">
                                  <Users2Icon className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium text-foreground/90">
                                    Used by {" "}
                                    {template.usageCount ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {session?.user?.id === template.createdById && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteTemplate(template.id)}
                                disabled={removeTemplateMutation.isPending || creatingAny}
                              >
                                <Trash2Icon className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {template.description ?? "No description provided."}
                        </p>

                        {/* Integrations with proper icons */}
                        {integrations.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-border/50" />
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                Integrations
                              </span>
                              <div className="h-px flex-1 bg-border/50" />
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {integrations.map((type) => {
                                const meta = INTEGRATION_META[type] ?? {
                                  label: type
                                    .replaceAll("_", " ")
                                    .toLowerCase()
                                    .replace(/^\w/, (c) => c.toUpperCase()),
                                  fallbackIcon: WebhookIcon,
                                };

                                return (
                                  <div
                                    key={type}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group/badge"
                                    title={meta.label}
                                  >
                                    <IntegrationIcon
                                      src={meta.icon}
                                      fallbackIcon={meta.fallbackIcon}
                                      alt={meta.label}
                                      className="w-4 h-4 object-contain shrink-0"
                                    />
                                    <span className="text-[11px] font-medium text-foreground/80 group-hover/badge:text-foreground">
                                      {meta.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {template.tags?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {template.tags.slice(0, 6).map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5 bg-secondary/50 hover:bg-secondary transition-colors"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </CardHeader>

                      <CardContent className="flex flex-col justify-end pt-0">
                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                          <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary/90">
                            Community
                          </Badge>

                          <Button
                            size="sm"
                            className="h-9 px-4 text-xs font-medium shadow-sm hover:shadow-md transition-all"
                            disabled={creatingAny}
                            onClick={() => handleUseCommunityTemplate(template.id)}
                          >
                            {isCreatingThis ? (
                              <>
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                Creating…
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="w-4 h-4 mr-1.5" />
                                Use Template
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );

                })}
              </div>
            ) : selectedFilterTags.length > 0 ? (
              <div className="text-center py-14 text-muted-foreground rounded-2xl border bg-card">
                <Users2Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No templates match the selected filters.</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSelectedFilterTags([])}
                  disabled={creatingAny}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="text-center py-14 text-muted-foreground rounded-2xl border bg-card">
                <Users2Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No community templates yet.</p>
                <p className="text-xs mt-2">Be the first to share your workflow!</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
