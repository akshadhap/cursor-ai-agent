// src/app/(dashboard)/(rest)/community/community-client.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useTemplates, useUseTemplate, useRemoveTemplate } from "@/features/templates/hooks/use-templates";
import { authClient } from "@/lib/auth-client";
import { TEMPLATE_TAGS } from "@/features/editor/components/save-to-community-button";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  WorkflowIcon,
  WebhookIcon,
  BotIcon,
  Users2Icon,
  Trash2Icon,
  Loader2Icon,
  SparklesIcon,
  GlobeIcon,
  DatabaseIcon,
  MessageSquareIcon,
  CalendarIcon,
  SearchIcon,
  TrendingUpIcon,
  FilterIcon,
} from "lucide-react";

// ---------------- COMMUNITY: Integrations helpers ----------------

type TemplateNodeJSON = {
  id?: string;
  type?: string;
  name?: string;
  data?: any;
};

const getIntegrationsFromTemplateNodes = (template: any): string[] => {
  const nodes = template?.nodes;

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

// Integration icon component
const IntegrationIcon = ({
  src,
  fallbackIcon: FallbackIcon,
  alt,
  className,
}: {
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
  {
    label: string;
    icon?: string;
    fallbackIcon?: React.ComponentType<{ className?: string }>;
  }
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
  GOOGLE_CALENDAR: {
    label: "Google Calendar",
    icon: "/logos/google-calendar.svg",
  },
  MCP_CLIENT_TOOL: {
    label: "MCP Client Tool",
    icon: "/logos/mcp-client-tool.svg",
  },
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
  TELEGRAM_TRIGGER: {
    label: "Telegram Trigger",
    icon: "/logos/telegram.svg",
  },
  AIRBNB: { label: "Airbnb", icon: "/logos/airbnb.svg" },
  EXPEDIA: { label: "Expedia", icon: "/logos/expedia.svg" },
  RAZORPAY: { label: "Razorpay", icon: "/logos/razorpay.png" },
};

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

export const CommunityClient = () => {
  const router = useRouter();


  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(
    null
  );

  const { data: session } = authClient.useSession();

  const { data: communityTemplates, isLoading: isLoadingTemplates } =
    useTemplates();
  const useTemplateMutation = useUseTemplate();
  const removeTemplateMutation = useRemoveTemplate();

  const filteredTemplates = useMemo(() => {
    if (!communityTemplates) return [];
    
    let filtered = communityTemplates;

    // Apply tag filters
    if (selectedFilterTags.length > 0) {
      filtered = filtered.filter((template) => {
        const templateTags = template.tags || [];
        return selectedFilterTags.every((tag) => templateTags.includes(tag));
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => 
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.createdBy?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [communityTemplates, selectedFilterTags, searchQuery]);

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };



  const guardSubscription = () => {
    return true;
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
    useTemplateMutation.isPending || creatingTemplateId !== null;

  const totalTemplates = communityTemplates?.length ?? 0;
  const totalUsage = communityTemplates?.reduce((acc, t) => acc + (t.usageCount ?? 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <SparklesIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Community Templates</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Discover and use workflows shared by the community.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3">
          <div className="px-4 py-2.5 rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-primary" />
              <div className="text-right">
                <div className="text-xl font-semibold">{totalTemplates}</div>
                <div className="text-xs text-muted-foreground">Templates</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-primary" />
              <div className="text-right">
                <div className="text-xl font-semibold">{totalUsage}</div>
                <div className="text-xs text-muted-foreground">Total Uses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates by name, description, or creator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Filters Section */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Label className="text-sm font-medium">Filter by Tags</Label>

          {selectedFilterTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedFilterTags([])}
              disabled={creatingAny}
            >
              Clear ({selectedFilterTags.length})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {TEMPLATE_TAGS.map((tag) => {
            const isSelected = selectedFilterTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform select-none text-xs px-3 py-1"
                onClick={() => !creatingAny && toggleFilterTag(tag)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>

        {selectedFilterTags.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} with: <span className="text-foreground font-medium">{selectedFilterTags.join(", ")}</span>
          </p>
        )}
      </div>

      {/* Body */}
      {isLoadingTemplates ? (
        <TemplateSkeletonGrid />
      ) : filteredTemplates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => {
            const isCreatingThis =
              creatingTemplateId === template.id &&
              useTemplateMutation.isPending;
            const integrations = getIntegrationsFromTemplateNodes(
              template
            ).slice(0, 8);

            return (
              <Card
                key={template.id}
                className="group border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
              >
                <CardHeader className="space-y-4 pb-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 shrink-0 ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all">
                        <SparklesIcon className="w-5 h-5 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 
                          className="text-base font-semibold text-foreground group-hover:text-primary transition-colors overflow-hidden text-ellipsis whitespace-nowrap block" 
                          title={template.name}
                        >
                          {template.name}
                        </h3>

                        <div className="mt-1.5 flex items-center gap-2 text-[11px] overflow-hidden">
                          <span className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap block min-w-0 flex-1" title={template.createdBy?.name ?? "Unknown"}>
                            <span className="font-medium text-foreground/90">
                              {template.createdBy?.name ?? "Unknown"}
                            </span>
                          </span>
                          <span className="text-muted-foreground/50 shrink-0">•</span>
                          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <Users2Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-foreground/90">
                              {template.usageCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {session?.user?.id === template.createdById && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={
                          removeTemplateMutation.isPending || creatingAny
                        }
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {template.description ?? "No description provided."}
                  </p>

                  {/* Integrations */}
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
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium border-primary/30 text-primary/90"
                    >
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
      ) : searchQuery || selectedFilterTags.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/60 bg-muted/20">
          <SearchIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-base font-semibold mb-1">No templates found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {searchQuery 
              ? `No templates match "${searchQuery}"`
              : "No templates match the selected filters."
            }
          </p>
          <div className="flex gap-2">
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                disabled={creatingAny}
              >
                Clear search
              </Button>
            )}
            {selectedFilterTags.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFilterTags([])}
                disabled={creatingAny}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/60 bg-muted/20">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <SparklesIcon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">No community templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Be the first to share your workflow with the community!
          </p>
          <Button
            onClick={() => router.push("/workflows")}
            size="sm"
          >
            <WorkflowIcon className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      )}
    </div>
  );
};
