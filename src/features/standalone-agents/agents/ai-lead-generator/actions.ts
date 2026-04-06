"use server";

import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function createAiLeadGeneratorAgent() {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Check if user already has an AI Lead Generator agent
  const existingAgent = await prisma.standaloneAgent.findFirst({
    where: {
      userId,
      type: "AI_LEAD_GENERATOR",
    },
  });

  // If agent exists, return its ID
  if (existingAgent) {
    return existingAgent.id;
  }

  // Create new agent only if none exists
  const name = "AI Lead Generator";

  // Create standalone agent record without workflow
  const agent = await prisma.standaloneAgent.create({
    data: {
      name,
      userId,
      type: "AI_LEAD_GENERATOR",
      status: "DRAFT",
      config: {
        apiKey: "lShupJrywrczAtsV9LJtza0jmwCgJmtbytzqtukzk2o",
        sourceId: "",
        extractionInterval: "hourly",
        qualificationCriteria: {
          hotLeadKeywords: ["interested", "demo", "pricing", "quote", "urgent", "asap"],
          coldLeadKeywords: ["maybe", "later", "not now", "thinking"],
          customRules: [],
        },
        routing: {
          hotLeadsAction: "SEND_TO_SALES",
          coldLeadsAction: "NURTURE_SEQUENCE",
        },
      },
    },
  });

  return agent.id;
}

export async function updateAiLeadGeneratorConfig(
  agentId: string,
  config: {
    apiKey: string;
    sourceId: string;
    extractionInterval: string;
    qualificationCriteria: any;
    routing: any;
  }
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify ownership
  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  // Update configuration
  const updated = await prisma.standaloneAgent.update({
    where: { id: agentId },
    data: {
      config,
      status: "CONFIGURED",
      updatedAt: new Date(),
    },
  });

  return updated;
}

export async function activateAiLeadGeneratorAgent(agentId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId,
    },
  });

  if (!agent) {
    throw new Error("Agent not found or unauthorized");
  }

  // Validate configuration before activation
  const config = agent.config as any;
  if (!config.apiKey || !config.sourceId) {
    throw new Error("Please configure API key and Source ID first");
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
