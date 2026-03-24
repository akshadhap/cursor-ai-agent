"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCardIcon,
  FolderOpenIcon,
  HistoryIcon,
  KeyIcon,
  LogOutIcon,
  StarIcon,
  LayoutTemplateIcon,
  MessageCircleIcon,
  BotIcon,
  FileIcon,
  PuzzleIcon,
  BookOpenIcon,
  PaintbrushIcon,
  PhoneCallIcon,
  Database,
  BarChart3Icon,
  LayoutDashboardIcon,
  BarChartIcon,
  CloudCog,
  Columns3CogIcon,
  GitCompare,
  LucideGitCompareArrows,
  BrainCircuitIcon,
  SparklesIcon,
  Loader2Icon,
  UserIcon,
  UserX2Icon,
  UsersIcon,
  Coins,
  UserPlus,
  CoinsIcon,
  Link2Icon,
  CpuIcon,
  HomeIcon,
  Package,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery as useConvexQuery } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useUserAgents } from "@/features/standalone-agents/hooks/use-agents";
import { AGENT_REGISTRY, AgentMetadata } from "@/features/standalone-agents/lib/agent-registry";
import { useTRPC } from "@/trpc/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Section = "dashboard" | "workflow" | "chatbot" | "voice" | "cognitive" | "slm";

const sectionMenus: Record<
  Section,
  {
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    url: string;
  }[]
> = {
  dashboard: [
    { title: "Catalogue", icon: Package, url: "/admin/catalogue" },
    { title: "Billing Portal", icon: CreditCardIcon, url: "/admin/billing" },
  ],
  workflow: [
    { title: "Workflow-landing", icon: HomeIcon, url: "/workflow-landing" },
    { title: "Workflows", icon: Columns3CogIcon, url: "/workflows" },
    { title: "Credentials", icon: KeyIcon, url: "/credentials" },
    { title: "Executions", icon: HistoryIcon, url: "/executions" },
    { title: "Templates", icon: LayoutTemplateIcon, url: "/templates" },
    { title: "Community", icon: UsersIcon, url: "/community" },
  ],
  chatbot: [
    { title: "Chatbot-landing", icon: HomeIcon, url: "/chatbot-landing" },
    { title: "Chatbot Builder", icon: BotIcon, url: "/chatbots" },
    { title: "Conversations", icon: MessageCircleIcon, url: "/conversations" },
    { title: "Knowledge Bases", icon: Database, url: "/knowledge-bases" },
    { title: "Customization", icon: PaintbrushIcon, url: "/customization" },
    { title: "Connect", icon: Link2Icon, url: "/connect" },
    { title: "Integrations", icon: PuzzleIcon, url: "/integrations" },
    { title: "Analytics", icon: BarChart3Icon, url: "/analytics" },
    { title: "AI Avatar", icon: BotIcon, url: "/plugins/ai-avatar" },
    { title: "Voice Assistant", icon: PhoneCallIcon, url: "/plugins/vapi" },
    // { title: "Salesforce", icon: CloudCog, url: "/plugins/salesforce" },
    { title: "Usage Metrics", icon: LayoutDashboardIcon, url: "/convex-usage" },
  ],
  voice: [
    { title: "Voice-landing", icon: HomeIcon, url: "/voice-landing" },
    { title: "Voice Agents", icon: BotIcon, url: "/voiceagent" },
    { title: "Call Logs", icon: PhoneCallIcon, url: "/call-logs" },
    { title: "Schedule calls", icon: PhoneCallIcon, url: "/scheduler" },
    { title: "Analytics", icon: BarChartIcon, url: "/voice-analytics" },
    { title: "Developer", icon: KeyIcon, url: "/developer" },
  ],
  cognitive: [
    { title: "Explore Agents", icon: BrainCircuitIcon, url: "/cognitive-agents" },
  ],
  slm: [
    { title: "SLM-landing", icon: HomeIcon, url: "/slm-landing" },
    { title: "SLM Models", icon: CpuIcon, url: "/slm" },
  ],
};

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { agents, isLoading: agentsLoading } = useUserAgents();
  const trpc = useTRPC();
  const isLandingPage = pathname.endsWith('-landing');

  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;
  // Get entity and employee data from Convex (real-time reactive queries)
  const entityIdData = useConvexQuery(
    api.public.entities.findEntitiesWithEmployeeEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );

  const firstEntity = entityIdData?.[0];
  const entityId = firstEntity?.entityId ?? null;
  const employeeId = firstEntity?.employees?.[0]?.employeeId ?? null;

  const entityData = useConvexQuery(
    api.public.entities.getEntity,
    entityId ? { entityId } : "skip"
  );

  const employeeData = useConvexQuery(
    api.public.entities.getEmployee,
    entityId && employeeId ? { entityId, employeeId } : "skip"
  );

  const currentUserProductsData = useConvexQuery(
    api.public.entities.listEmployeeProducts,
    entityId && employeeId ? { entityId, employeeId, assignedOnly: true } : "skip"
  );

  const isLoadingEntityData = entityIdData === undefined || (entityId && entityData === undefined);

  // Get active plans from entity data
  const activePlans = entityData?.activePlans || {};

  // Build user access map from products (isEnabled check)
  const userProductAccess = React.useMemo(() => {
    if (!currentUserProductsData?.products || !Array.isArray(currentUserProductsData.products)) return {};

    const accessMap: Record<string, boolean> = {};
    currentUserProductsData.products.forEach((product: any) => {
      // Check both isEnabled (new) and enabled (legacy) for backward compatibility
      accessMap[product.productId] = product.isEnabled === true || product.enabled === true;
    });
    return accessMap;
  }, [currentUserProductsData]);

  const agentMetadataById = React.useMemo(() => {
    return Object.values(AGENT_REGISTRY).reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {} as Record<string, AgentMetadata>);
  }, []);

  const purchasedAgentIds = React.useMemo(() => {
    if (!currentUserProductsData?.products || !Array.isArray(currentUserProductsData.products)) return [] as string[];
    return currentUserProductsData.products
      .filter((product: any) =>
        typeof product?.productId === "string" &&
        product.productId.startsWith("cognitive_") &&
        (product.isEnabled === true || product.enabled === true)
      )
      .map((product: any) => product.productId.replace(/^cognitive_/, "").replace(/_/g, "-"));
  }, [currentUserProductsData]);

  const createdAgentTypeIds = React.useMemo(() => {
    return new Set(
      (agents || [])
        .map((agent) => (agent?.type ? String(agent.type).toLowerCase().replace(/_/g, "-") : null))
        .filter((value): value is string => Boolean(value))
    );
  }, [agents]);

  const availablePurchasedAgents = React.useMemo(() => {
    return purchasedAgentIds.filter((agentId: string) => !createdAgentTypeIds.has(agentId));
  }, [purchasedAgentIds, createdAgentTypeIds]);

  // Auto-redirect based on subscription status
  useEffect(() => {
    if (isLoadingEntityData || !pathname) return;

    const sectionConfig: Record<string, { planKey: string, landingUrl: string, productUrl: string }> = {
      'workflow': { planKey: 'workflows', landingUrl: '/workflow-landing', productUrl: '/workflows' },
      'chatbot': { planKey: 'chatbot_builder', landingUrl: '/chatbot-landing', productUrl: '/chatbots' },
      'voice': { planKey: 'voice_agent', landingUrl: '/voice-landing', productUrl: '/voiceagent' },
      'slm': { planKey: 'slm', landingUrl: '/slm-landing', productUrl: '/slm' },
    };

    // Check if we're on a landing page
    const onLandingPage = Object.values(sectionConfig).find(config => pathname === config.landingUrl);
    if (onLandingPage) {
      const hasAccess = userProductAccess[onLandingPage.planKey] === true;

      // If user now has access enabled, redirect to the product page
      if (hasAccess) {
        router.push(onLandingPage.productUrl);
      }
      return;
    }

    // Check if we're on a product page
    const onProductPage = Object.values(sectionConfig).find(config =>
      pathname.startsWith(config.productUrl) && pathname !== config.landingUrl
    );
    if (onProductPage) {
      const hasAccess = userProductAccess[onProductPage.planKey] === true;

      // If access is disabled, redirect to landing page
      if (!hasAccess) {
        router.push(onProductPage.landingUrl);
      }
    }
  }, [userProductAccess, pathname, isLoadingEntityData, router]);

  // Filter menu items based on subscriptions
  const getFilteredMenu = (section: Section) => {
    const menu = sectionMenus[section];
    if (!menu) return [];

    // Map sections to plan keys
    const sectionToPlan: Record<string, string> = {
      workflow: 'workflows',
      chatbot: 'chatbot_builder',
      voice: 'voice_agent',
      slm: 'slm',
    };

    const planKey = sectionToPlan[section];
    if (!planKey) return menu; // Return all for dashboard and cognitive

    // Check if user has access enabled for this product
    const hasAccess = userProductAccess[planKey] === true;

    // If user has access, show all items except landing
    // If user doesn't have access, show only landing
    return menu.filter(item => {
      const isLandingItem = item.url.endsWith('-landing');
      return hasAccess ? !isLandingItem : isLandingItem;
    });
  };

  // Check if user has access to dashboard based on entity role
  // User has dashboard access if they are ADMIN or if they created the entity
  const isDashboardUser = React.useMemo(() => {
    if (!entityData || !currentEmail) return false;

    // Check if user is the creator of the entity
    const isCreator = entityData.createdBy && employeeData?.employeeId === entityData.createdBy;

    // Check if user has ADMIN role in their employee data
    const hasAdminRole = employeeData?.roles?.includes('ADMIN');

    return isCreator || hasAdminRole;
  }, [entityData, employeeData, currentEmail]);

  const activeSection: Section = (() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return "dashboard";
    }
    if (
      pathname.startsWith("/workflows") ||
      pathname.startsWith("/credentials") ||
      pathname.startsWith("/executions") ||
      pathname.startsWith("/templates") ||
      pathname.startsWith("/workflow-landing")
    ) {
      return "workflow";
    }
    if (
      pathname.startsWith("/chatbots") ||
      pathname.startsWith("/conversations") ||
      pathname.startsWith("/files") ||
      pathname.startsWith("/knowledge-bases") ||
      pathname.startsWith("/customization") ||
      pathname.startsWith("/connect") ||
      pathname.startsWith("/integrations") ||
      pathname.startsWith("/plugins/vapi") ||
      pathname.startsWith("/plugins/ai-avatar") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/convex-usage") ||
      pathname.startsWith("/chatbot-landing")
    ) {
      return "chatbot";
    }
    if (pathname.startsWith("/voiceagent") || pathname.startsWith("/call-logs") ||
      pathname.startsWith("/scheduler") || pathname.startsWith("/dashboard") ||
      pathname.includes("/voice-analytics") || pathname.startsWith("/customvoiceagent") || pathname.startsWith("/developer") ||
      pathname.startsWith("/voice-landing")
    ) return "voice";
    if (pathname.startsWith("/cognitive-agents") || pathname.startsWith("/cognitive-landing")) return "cognitive";
    if (pathname.startsWith("/slm") || pathname.startsWith("/slm-landing")) return "slm";
    return "workflow";
  })();

  const tokenUsage = useConvexQuery(
    (api as any).private.tokenUsage.getMonthToDate,
    entityId ? { entityId } : "skip",
  );

  // Check if there are any running executions
  const { data: runningData } = useQuery({
    ...trpc.executions.hasRunningExecutions.queryOptions(),
    enabled: activeSection === "workflow",
    refetchInterval: 1000,
  });

  const hasRunningExecutions = runningData?.hasRunning ?? false;

  // Query workflow tokens with real-time updates
  // Use faster polling (500ms) during active executions, slower (5s) when idle
  const { data: workflowTokensData, isLoading: tokensLoading } = useQuery({
    ...trpc.executions.getTotalTokens.queryOptions(),
    enabled: activeSection === "workflow",
    refetchInterval: hasRunningExecutions ? 500 : 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const monthlyTokens = tokenUsage?.totalTokens ?? 0;
  const monthlyCap = 2000000;
  const usagePct = Math.min(100, (monthlyTokens / monthlyCap) * 100);

  const workflowTokens = workflowTokensData?.totalTokens ?? 0;

  // Debug logging
  if (activeSection === "workflow") {
    console.log('Workflow tokens query:', {
      isLoading: tokensLoading,
      data: workflowTokensData,
      totalTokens: workflowTokens
    });
  }

  const isActiveUrl = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  const currentMenu = getFilteredMenu(activeSection);

  // Keep sidebar collapsed when no subscription or on landing page
  // Open sidebar when user has subscription
  useEffect(() => {
    // Don't make decisions until data is loaded
    if (isLoadingEntityData) return;

    const sectionToPlan: Record<string, string> = {
      workflow: 'workflows',
      chatbot: 'chatbot_builder',
      voice: 'voice_agent',
      slm: 'slm',
    };

    const planKey = sectionToPlan[activeSection];
    const hasSubscription = planKey ? (activePlans[planKey] !== null && activePlans[planKey] !== undefined) : true;

    // Open sidebar if has subscription and not on landing page
    // Collapse sidebar if no subscription or on landing page
    if (hasSubscription && !isLandingPage) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [activeSection, activePlans, isLandingPage, isLoadingEntityData, setOpen]);

  // Helper to get navigation URL based on subscription status
  const getSectionUrl = (section: string, defaultUrl: string) => {
    const sectionToPlan: Record<string, string> = {
      workflow: 'workflows',
      chatbot: 'chatbot_builder',
      voice: 'voice_agent',
      slm: 'slm',
    };

    const planKey = sectionToPlan[section];
    if (!planKey) return defaultUrl; // Dashboard and cognitive use default

    const hasSubscription = activePlans[planKey] !== null && activePlans[planKey] !== undefined;

    // If not subscribed, navigate to landing page
    if (!hasSubscription) {
      return `/${section}-landing`;
    }

    return defaultUrl;
  };

  // Handle rail icon click
  const handleRailClick = async (section: string, defaultUrl: string) => {
    // Avoid blocking the UI thread while data is loading.
    if (isLoadingEntityData) {
      router.push(defaultUrl);
      return;
    }

    const url = getSectionUrl(section, defaultUrl);
    const sectionToPlan: Record<string, string> = {
      workflow: 'workflows',
      chatbot: 'chatbot_builder',
      voice: 'voice_agent',
      slm: 'slm',
    };

    const planKey = sectionToPlan[section];
    const hasSubscription = planKey ? (activePlans[planKey] !== null && activePlans[planKey] !== undefined) : true;

    // If subscribed, open sidebar; if not, keep it collapsed
    if (hasSubscription) {
      setOpen(true);
    } else {
      setOpen(false);
    }

    router.push(url);
  };

  return (
    <Sidebar collapsible="icon" className={cn("p-0", isLandingPage && "dark")}>
      <div className="flex h-full">
        {/* 🔹 Left rail (now also holds ThemeToggle at the bottom) */}
        <div className={cn(
          "flex flex-col items-center bg-black h-full py-4 border-r border-border gap-2 transition-[width] duration-200",
          open ? "w-16" : "w-16"
        )}>
          {/* Logo / Home */}
          <Link href="/" className="mb-4" title="Home">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-transparent">
              <Image
                src="/logos/logo.png"
                alt="Nodebase"
                width={16}
                height={16}
              />
            </div>
          </Link>

          {/* Dashboard icon - only for authorized users */}
          {isDashboardUser && (
            <Link
              href="/admin"
              title="Dashboard"
              className={cn(
                "group w-10 h-10 flex items-center justify-center rounded-md transition",
                activeSection === "dashboard"
                  ? "bg-[#17171a] text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-[#27272a]"
              )}
            >
              <LayoutDashboardIcon className="h-5 w-5" />
            </Link>
          )}

          {/* Workflows icon */}
          <button
            onClick={() => handleRailClick('workflow', '/workflows')}
            title="Workflows"
            className={cn(
              "group w-10 h-10 flex items-center justify-center rounded-md transition",
              activeSection === "workflow"
                ? "bg-[#17171a] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-[#27272a]"
            )}
          >
            <LucideGitCompareArrows className="h-5 w-5" />
          </button>

          {/* Chatbot icon */}
          <button
            onClick={() => handleRailClick('chatbot', '/chatbots')}
            title="Chatbot"
            className={cn(
              "group w-10 h-10 flex items-center justify-center rounded-md transition",
              activeSection === "chatbot"
                ? "bg-[#17171a] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-[#27272a]"
            )}
          >
            <MessageCircleIcon className="h-5 w-5" />
          </button>

          {/* Voice Agents icon */}
          <button
            onClick={() => handleRailClick('voice', '/voiceagent')}
            title="Voice Agents"
            className={cn(
              "group w-10 h-10 flex items-center justify-center rounded-md transition",
              activeSection === "voice"
                ? "bg-[#17171a] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-[#27272a]"
            )}
          >
            <PhoneCallIcon className="h-5 w-5" />
          </button>

          {/* Cognitive Agents icon */}
          <Link
            href="/cognitive-agents"
            title="Cognitive Agents"
            className={cn(
              "group w-10 h-10 flex items-center justify-center rounded-md transition",
              activeSection === "cognitive"
                ? "bg-[#17171a] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-[#27272a]"
            )}
          >
            <BrainCircuitIcon className="h-5 w-5" />
          </Link>

          {/* SLM icon */}
          <button
            onClick={() => handleRailClick('slm', '/slm')}
            title="SLM"
            className={cn(
              "group w-10 h-10 flex items-center justify-center rounded-md transition",
              activeSection === "slm"
                ? "bg-[#17171a] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-[#27272a]"
            )}
          >
            <CpuIcon className="h-5 w-5" />
          </button>

          {/* 🔻 Push ThemeToggle to bottom of the left rail */}
          {/* {!isLandingPage && (
            <div className="mt-auto pt-4">
              <ThemeToggle />
            </div>
          )} */}

          {/* 🔻 Push ThemeToggle and Profile to bottom of the left rail */}
          {/* {!isLandingPage && (
  <div className="mt-auto pt-4 flex flex-col gap-2">
    <ThemeToggle />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Profile"
          className="w-10 h-10 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#27272a] transition"
        >
          <UserIcon className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-48">
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          className="cursor-pointer"
        >
          <LogOutIcon className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)}


{isLandingPage && (
  <div className="mt-auto pt-4 flex flex-col gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Profile"
          className="w-10 h-10 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#27272a] transition"
        >
          <UserIcon className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-48">
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          className="cursor-pointer"
        >
          <LogOutIcon className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)} */}

          {/* 🔻 Push ThemeToggle and Profile to bottom of the left rail */}
          {!isLandingPage && (
            <div className="mt-auto pt-4 flex flex-col gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Profile Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-white dark:bg-white border-gray-200 dark:border-gray-200 text-gray-900 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100 [&_svg]:text-gray-900 dark:[&_svg]:text-gray-900"
                    aria-label="Profile menu"
                  >
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-48">
                  <DropdownMenuItem
                    onClick={() => authClient.signOut()}
                    className="cursor-pointer"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* For landing pages - only show profile button */}
          {isLandingPage && (
            <div className="mt-auto pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-white dark:bg-white border-gray-200 dark:border-gray-200 text-gray-900 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100 [&_svg]:text-gray-900 dark:[&_svg]:text-gray-900"
                    aria-label="Profile menu"
                  >
                    <UserIcon className="h-4 w-4 " />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-48">
                  <DropdownMenuItem
                    onClick={() => authClient.signOut()}
                    className="cursor-pointer"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* 🔸 Main sidebar content (changes with section) */}
        <div
          className={cn(
            "flex flex-col h-full transition-[width] duration-200 ease-in-out overflow-hidden",
            open ? "w-64" : "w-0"
          )}
        >
          <SidebarHeader>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm capitalize">
                    {activeSection === "dashboard"
                      ? "Dashboard"
                      : activeSection === "workflow"
                        ? "Workflows"
                        : activeSection === "chatbot"
                          ? "Chatbot"
                          : activeSection === "cognitive"
                            ? "Cognitive Agents"
                            : activeSection === "slm"
                              ? "SLM"
                              : "Voice Agents"}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoadingEntityData ? (
                    // Shimmer loading state
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <SidebarMenuItem key={i}>
                          <div className="h-10 px-4 flex items-center gap-x-4 rounded-md">
                            <div className="size-5 rounded-md bg-gradient-to-r from-sidebar-accent/40 via-sidebar-accent/20 to-sidebar-accent/40 animate-shimmer bg-[length:200%_100%] shadow-sm" />
                            <div className="h-4 rounded bg-gradient-to-r from-sidebar-accent/40 via-sidebar-accent/20 to-sidebar-accent/40 animate-shimmer bg-[length:200%_100%] shadow-sm" style={{ width: `${55 + i * 5}%` }} />
                          </div>
                        </SidebarMenuItem>
                      ))}
                      <SidebarMenuItem>
                        <div className="h-8 px-4 mt-6 mb-2">
                          <div className="h-3 w-24 rounded bg-gradient-to-r from-sidebar-accent/30 via-sidebar-accent/15 to-sidebar-accent/30 animate-shimmer bg-[length:200%_100%]" />
                        </div>
                      </SidebarMenuItem>
                    </>
                  ) : (
                    currentMenu.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActiveUrl(item.url)}
                          asChild
                          className="gap-x-4 h-10 px-4"
                        >
                          <Link
                            href={item.url}
                            prefetch
                            onClick={() => {
                              if (item.url.endsWith('-landing')) {
                                setOpen(false);
                              }
                            }}
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Your Agents Section - Only show in cognitive section */}
            {activeSection === "cognitive" && (
              <SidebarGroup>
                <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground">
                  Your Agents
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {agentsLoading ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled className="gap-x-4 h-10 px-4">
                          <Loader2Icon className="size-4 animate-spin" />
                          <span>Loading agents...</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : agents.length === 0 && availablePurchasedAgents.length === 0 ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled className="gap-x-4 h-10 px-4">
                          <SparklesIcon className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground text-sm">No agents yet</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      <>
                        {agents.map((agent) => (
                          <SidebarMenuItem key={agent.id}>
                            <SidebarMenuButton
                              tooltip={agent.name}
                              asChild
                              className="gap-x-2 h-10 px-4"
                              isActive={pathname.includes(`/cognitive-agents/${agent.id}`)}
                            >
                              <Link href={`/cognitive-agents/${agent.id}`} prefetch>
                                <SparklesIcon className="size-4 shrink-0" />
                                <span className="truncate flex-1">
                                  {AGENT_REGISTRY[agent.type as keyof typeof AGENT_REGISTRY]?.name || agent.name}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                        {availablePurchasedAgents.map((agentId: string) => {
                          const meta = agentMetadataById[agentId];
                          return (
                            <SidebarMenuItem key={`purchased-${agentId}`}>
                              <SidebarMenuButton
                                tooltip={meta?.name || agentId}
                                asChild
                                className="gap-x-2 h-10 px-4"
                                isActive={pathname.includes(`/cognitive-agents/create/${agentId}`)}
                              >
                                <Link href={`/cognitive-agents/create/${agentId}`} prefetch>
                                  <SparklesIcon className="size-4 shrink-0" />
                                  <span className="truncate flex-1">
                                    {meta?.name || agentId}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              {activeSection === "workflow" && (
                <SidebarMenuItem>
                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total tokens</span>
                      <span className="font-medium">
                        {tokensLoading ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : (
                          new Intl.NumberFormat().format(workflowTokens)
                        )}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Across all workflow executions
                    </div>
                  </div>
                </SidebarMenuItem>
              )}

              {activeSection === "chatbot" && (
                <SidebarMenuItem>
                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Token usage</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat().format(monthlyTokens)} / {new Intl.NumberFormat().format(monthlyCap)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={usagePct} className="h-1.5" />
                    </div>
                  </div>
                </SidebarMenuItem>
              )}

              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Billing Portal"
                  className="gap-x-4 h-10 px-4"
                  onClick={() => authClient.customer.portal()}
                >
                  <CreditCardIcon className="h-4 w-4" />
                  <span>Billing Portal</span>
                </SidebarMenuButton>
              </SidebarMenuItem> */}

              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign out"
                  className="gap-x-4 h-10 px-4"
                  onClick={() => authClient.signOut()}
                >
                  <LogOutIcon className="h-4 w-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
            </SidebarMenu>
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
};
