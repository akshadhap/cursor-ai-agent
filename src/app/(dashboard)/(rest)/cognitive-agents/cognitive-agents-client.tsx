"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3Icon,
  BotIcon,
  MailIcon,
  SparklesIcon,
  Users2Icon,
  BrainCircuitIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ZapIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { useUserAgents } from "@/features/standalone-agents/hooks/use-agents";
import { getAllAgents, agentIdToType } from "@/features/standalone-agents/lib/agent-registry";
import { authClient } from "@/lib/auth-client";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Icon mapping
const ICON_MAP: Record<string, any> = {
  SparklesIcon,
  MailIcon,
  BarChart3Icon,
  BotIcon,
  Users2Icon,
};

const COGNITIVE_AGENTS = getAllAgents();

export const CognitiveAgentsClient = ({ leadCounts }: { leadCounts: Record<string, number> }) => {

  const { agents, refetch } = useUserAgents();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [launchingAgentId, setLaunchingAgentId] = useState<string | null>(null);
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;
  const currentUserId = session?.user?.id ?? null;

  // Get entity and employee info from Convex (not session)
  const entityIdData = useConvexQuery(
    api.public.entities.getEntityIdByEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );
  const entityId = entityIdData?.entityId ?? null;
  const employeeId = entityIdData?.employeeId ?? null;

  const employeeData = useConvexQuery(
    api.public.entities.getEmployee,
    entityId && employeeId ? { entityId, employeeId } : "skip"
  );
  const isOwner = employeeData?.role === "OWNER";

  // Query Convex for current user's products to check cognitive agent access
  const currentUserProductsData = useConvexQuery(
    api.public.entities.listEmployeeProducts,
    entityId && employeeId ? { entityId, employeeId, assignedOnly: true } : "skip"
  );

  // Build cognitive access map from Convex products
  const cognitiveAccessMap = useMemo(() => {
    if (!currentUserProductsData?.products || !Array.isArray(currentUserProductsData.products)) return {};

    return currentUserProductsData.products.reduce((acc: Record<string, boolean>, product: any) => {
      if (typeof product?.productId === "string" && product.productId.startsWith("cognitive_")) {
        const agentId = product.productId.replace(/^cognitive_/, "").replace(/_/g, "-");
        acc[agentId] = product.isEnabled === true;
      }
      return acc;
    }, {});
  }, [currentUserProductsData]);

  const canLaunch = true;

  // Show success message if redirected after checkout
  useEffect(() => {
    const checkoutSuccess = searchParams?.get("checkout_success");
    const agentId = searchParams?.get("agent_id");

    if (checkoutSuccess === "true" && agentId) {
      toast.success("Subscription activated!", {
        description: `Your ${agentId} agent is now ready to use.`,
      });
      // Clear the success params from URL
      const timer = setTimeout(() => {
        router.replace("/cognitive-agents", { scroll: false });
      }, 100);
      return () => clearTimeout(timer);
    }

    const error = searchParams?.get("error");
    if (error === "subscription") {
      toast.error("Pro subscription required", {
        description: "Please upgrade to Pro to launch cognitive agents.",
      });
      // Clear the error from URL without causing re-render issues
      const timer = setTimeout(() => {
        router.replace("/cognitive-agents", { scroll: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  // Refetch agents when component mounts or when returning to page
  useEffect(() => {
    if (refetch) {
      refetch();
    }
  }, [refetch]);

  // Get the user's existing agent for a specific type
  const getAgentUrl = (agentId: string) => {
    const existingAgent = agents.find((a) => a.type === agentIdToType(agentId));
    return existingAgent
      ? `/cognitive-agents/${existingAgent.id}`
      : `/cognitive-agents/create/${agentId}`;
  };

  const handleLaunchAgent = async (agentId: string) => {
    if (!currentEmail || !entityId || !employeeId) {
      toast.error("Authentication required", {
        description: "Please log in to launch agents.",
      });
      return;
    }

    // Check if user already has access via Convex
    if (cognitiveAccessMap[agentId]) {
      // User already has subscription, navigate directly
      console.log('[CognitiveAgents] User already has access to agent:', agentId);
      const url = getAgentUrl(agentId);
      router.push(url);
      return;
    }

    // User doesn't have subscription, initiate Polar checkout
    setLaunchingAgentId(agentId);
    try {
      const productKey = `cognitive-${agentId}`;

      // Use employeeId as externalCustomerId for non-owners, entityId for owners
      const externalCustomerId = isOwner ? entityId : employeeId;

      console.log('[CognitiveAgents] Initiating Polar checkout for ALL agents:', {
        agentId,
        productKey,
        externalCustomerId,
        isOwner,
        normalizedProductId: productKey.replace(/-/g, '_'),
      });

      // Build success URL to return to cognitive agents page with all required params
      // This works for ALL cognitive agents: ai-lead-generator, gmail-classifier, linkedin-scheduler, etc.
      const successUrl = `${window.location.origin}/checkout/success?checkout_id={CHECKOUT_ID}&product_key=${productKey}&tier_key=basic&external_customer_id=${externalCustomerId}&redirect_to=cognitive-agents&agent_id=${agentId}`;

      console.log('[CognitiveAgents] Success URL:', successUrl);

      const checkoutResponse = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productKey,
          tierKey: 'basic',
          externalCustomerId,
          customerEmail: currentEmail,
          customerName: session?.user?.name || currentEmail,
          successUrl,
        })
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Checkout failed: ${checkoutResponse.status}`);
      }

      const { url } = await checkoutResponse.json();
      if (!url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Polar checkout
      window.location.href = url;
    } catch (error) {
      console.error('[CognitiveAgents] Failed to initiate checkout:', error);
      toast.error("Failed to launch checkout", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
      setLaunchingAgentId(null);
    }
  };

  // Get lead count for an agent type
  const getLeadCount = (agentId: string) => {
    const type = agentIdToType(agentId);
    return leadCounts[type] || 0;
  };

  const handleRequestAccess = () => {
    const target = document.getElementById("agent-marketplace");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="p-4 md:px-10 md:py-6 min-h-screen bg-linear-to-br from-background via-background to-primary/5 dark:to-primary/2">
      <div className="mx-auto max-w-7xl w-full space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-card via-card to-primary/5 dark:to-primary/2 px-8 py-12 text-center shadow-lg backdrop-blur-sm">
          {/* Animated background gradient orbs */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-linear-to-br from-primary/20 to-purple-500/20 dark:from-primary/10 dark:to-purple-500/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-linear-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10 blur-3xl animate-pulse [animation-delay:1s]" />

          <div className="relative mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-primary to-purple-600 dark:from-primary/80 dark:via-primary/80 dark:to-purple-600/80 shadow-lg shadow-primary/30 dark:shadow-primary/20 animate-[pulse_3s_ease-in-out_infinite]">
                <BrainCircuitIcon className="h-7 w-7 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-[gradient_6s_ease-in-out_infinite]">
                Cognitive Agents Marketplace
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                An AI-powered ecosystem for business development intelligence. Automate lead generation,
                outreach, CRM sync, and analytics with intelligent cognitive agents that work 24/7.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                className="group relative overflow-hidden bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleRequestAccess}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <ZapIcon className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                Explore Marketplace
                <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </section>

        {/* Agent Marketplace */}
        <section id="agent-marketplace" className="space-y-6">
          <div className="space-y-2 animate-[fadeIn_0.7s_ease-in]">
            <h2 className="text-2xl font-bold tracking-tight">
              Your Smart Agent Squad
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Mix and match specialized cognitive agents to build your outbound engine.
              Each agent is designed to excel at specific tasks while working seamlessly together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {COGNITIVE_AGENTS
              .sort((a, b) => {
                // Sort live agents first
                if (a.status === "live" && b.status !== "live") return -1;
                if (a.status !== "live" && b.status === "live") return 1;
                return 0;
              })
              .map((agent, index) => {
                const Icon = ICON_MAP[agent.icon] || SparklesIcon;
                const isLive = agent.status === "live";
                const leadCount = getLeadCount(agent.id);
                const hasLeads = leadCount > 0;

                return (
                  <Card
                    key={agent.id}
                    className="group relative hover:shadow-lg transition-all duration-500 flex flex-col overflow-hidden hover:-translate-y-1 animate-[fadeInUp_0.5s_ease-out] hover:border-primary/30"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Animated shimmer effect */}
                    <div className="absolute inset-0 bg-accent/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <CardHeader className="space-y-4 pb-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base font-bold group-hover:text-primary transition-colors duration-300">
                              {agent.name}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isLive ? "default" : "secondary"}
                                className={`text-[10px] transition-all duration-300 ${isLive ? 'animate-pulse' : ''}`}
                              >
                                {isLive ? "✓ Live Now" : "Coming Soon"}
                              </Badge>
                              {hasLeads && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-primary/5 border-primary/20 text-primary"
                                >
                                  {leadCount} lead{leadCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {isLive && (
                          <div className="shrink-0 animate-[bounce_2s_ease-in-out_infinite]">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                          </div>
                        )}
                      </div>

                      <CardDescription className="text-sm leading-relaxed">
                        {agent.description}
                      </CardDescription>

                      {/* Features List */}
                      <div className="space-y-2">
                        {agent.features.map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 group/feature"
                            style={{ animationDelay: `${(index * 0.1) + (idx * 0.05)}s` }}
                          >
                            <CheckCircle2Icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0 group-hover/feature:scale-125 transition-transform duration-200" />
                            <span className="text-xs text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tags.map((tag, tagIdx) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] hover:bg-primary/10 hover:border-primary/40 hover:scale-105 transition-all duration-200 cursor-default"
                            style={{ animationDelay: `${(index * 0.1) + (tagIdx * 0.03)}s` }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 mt-auto relative">
                      {isLive ? (
                        <Button
                          size="lg"
                          className="w-full group/btn transition-all duration-300 shadow-md hover:shadow-lg"
                          variant="default"
                          disabled={!canLaunch || launchingAgentId === agent.id}
                          onClick={() => handleLaunchAgent(agent.id)}
                        >
                          {launchingAgentId === agent.id ? (
                            <>
                              <Loader2Icon className="w-4 h-4 animate-spin" />
                              Launching...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="w-4 h-4 group-hover/btn:rotate-12 group-hover/btn:scale-110 transition-all duration-300" />
                              Launch Agent
                              <ArrowRightIcon className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className="w-full group/btn transition-all duration-300"
                          variant="outline"
                          disabled
                        >
                          <MailIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                          Request Access
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
};
