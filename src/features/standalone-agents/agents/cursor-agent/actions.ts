"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { AGENT_TYPES } from "../../lib/agent-registry";

/**
 * Create or get existing Cursor Agent for the authenticated user
 */
export async function createCursorAgent() {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Check if user already has a Cursor Agent
  const existingAgent = await prisma.standaloneAgent.findFirst({
    where: {
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  // If agent exists, return its ID
  if (existingAgent) {
    return existingAgent.id;
  }

  // Create new cursor agent with default configuration
  const agent = await prisma.standaloneAgent.create({
    data: {
      name: "Cursor AI Assistant",
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
      status: "DRAFT",
      config: {
        preferences: {
          enabledCapabilities: [
            "chat",
            "summarize",
            "explain",
            "generateTasks",
            "draftEmail",
            "scrape",
            "enrich",
          ],
          triggers: {
            textSelection: true,
            rightClick: true,
            keyboardShortcut: "Alt+S",
          },
        },
        integrations: {
          notion: { connected: false },
          slack: { connected: false },
          jira: { connected: false },
        },
      },
      data: {
        activities: [],
        analytics: {
          totalActions: 0,
          actionsByType: {
            chat: 0,
            summarize: 0,
            explain: 0,
            task: 0,
            email: 0,
            scrape: 0,
            enrich: 0,
          },
          dailyUsage: {},
          lastActive: null,
        },
        onboardingCompleted: false,
      },
    },
  });

  return agent.id;
}

/**
 * Update Cursor Agent configuration (preferences & integrations)
 */
export async function updateCursorAgentConfig(
  agentId: string,
  config: {
    preferences?: {
      enabledCapabilities?: string[];
      triggers?: {
        textSelection?: boolean;
        rightClick?: boolean;
        keyboardShortcut?: string;
      };
    };
    integrations?: {
      notion?: { connected: boolean; token?: string; workspaceId?: string };
      slack?: { connected: boolean; token?: string; workspaceId?: string };
      jira?: { connected: boolean; token?: string; domain?: string };
    };
  }
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  const currentConfig = (agent.config as any) || {};

  // Merge configurations
  const updatedConfig = {
    ...currentConfig,
    preferences: {
      ...currentConfig.preferences,
      ...config.preferences,
    },
    integrations: {
      ...currentConfig.integrations,
      ...config.integrations,
    },
  };

  // Update configuration
  const updated = await prisma.standaloneAgent.update({
    where: { id: agentId },
    data: {
      config: updatedConfig,
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(agentId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  const currentData = (agent.data as any) || {};

  // Update data to mark onboarding as completed
  const updated = await prisma.standaloneAgent.update({
    where: { id: agentId },
    data: {
      status: "CONFIGURED",
      data: {
        ...currentData,
        onboardingCompleted: true,
      },
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Save activity from extension
 */
export async function saveCursorAgentActivity(
  agentId: string,
  activity: {
    type: "chat" | "summarize" | "explain" | "task" | "email" | "scrape" | "enrich";
    details: any;
    url?: string;
    timestamp: string;
  }
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  const currentData = (agent.data as any) || { activities: [], analytics: {} };
  const activities = currentData.activities || [];
  const analytics = currentData.analytics || {
    totalActions: 0,
    actionsByType: {},
    dailyUsage: {},
  };

  // Add activity with unique ID
  const newActivity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...activity,
  };

  activities.unshift(newActivity); // Add to beginning

  // Keep only last 1000 activities
  if (activities.length > 1000) {
    activities.splice(1000);
  }

  // Update analytics
  analytics.totalActions = (analytics.totalActions || 0) + 1;
  analytics.actionsByType = analytics.actionsByType || {};
  analytics.actionsByType[activity.type] = (analytics.actionsByType[activity.type] || 0) + 1;

  // Update daily usage
  const today = new Date(activity.timestamp).toISOString().split("T")[0];
  analytics.dailyUsage = analytics.dailyUsage || {};
  analytics.dailyUsage[today] = (analytics.dailyUsage[today] || 0) + 1;
  analytics.lastActive = activity.timestamp;

  // Update agent data
  const updated = await prisma.standaloneAgent.update({
    where: { id: agentId },
    data: {
      data: {
        ...currentData,
        activities,
        analytics,
      },
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Get activity log for dashboard
 */
export async function getCursorAgentActivity(
  agentId: string,
  options?: {
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  const data = (agent.data as any) || { activities: [] };
  let activities = data.activities || [];

  // Apply filters
  if (options?.type) {
    activities = activities.filter((a: any) => a.type === options.type);
  }

  if (options?.startDate || options?.endDate) {
    activities = activities.filter((a: any) => {
      const activityDate = new Date(a.timestamp);
      if (options.startDate && activityDate < new Date(options.startDate)) {
        return false;
      }
      if (options.endDate && activityDate > new Date(options.endDate)) {
        return false;
      }
      return true;
    });
  }

  // Apply limit
  if (options?.limit) {
    activities = activities.slice(0, options.limit);
  }

  return activities;
}

/**
 * Get analytics for dashboard
 */
export async function getCursorAgentAnalytics(agentId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  const data = (agent.data as any) || { analytics: {} };
  return data.analytics || {
    totalActions: 0,
    actionsByType: {},
    dailyUsage: {},
    lastActive: null,
  };
}

/**
 * Activate the Cursor Agent
 */
export async function activateCursorAgent(agentId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  // Activate the agent
  const activated = await prisma.standaloneAgent.update({
    where: { id: agentId },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
    },
  });

  return activated;
}

/**
 * Get cursor agent by ID
 */
export async function getCursorAgent(agentId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
      type: AGENT_TYPES.CURSOR_AGENT,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  return agent;
}
