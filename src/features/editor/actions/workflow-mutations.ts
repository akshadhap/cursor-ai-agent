"use server";

import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { NodeType, AgentType } from "@/generated/prisma";
import { inngest } from "@/inngest/client";

interface NodeInput {
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  data?: Record<string, any>;
  credentialId?: string;
  agentType?: AgentType;
}

interface ConnectionInput {
  fromNodeId: string;
  toNodeId: string;
  fromOutput?: string;
  toInput?: string;
}

/**
 * Apply AI-generated changes to a workflow
 */
export async function applyWorkflowChanges(
  workflowId: string,
  changes: {
    addNodes?: NodeInput[];
    removeNodes?: string[];
    updateNodes?: Array<{ id: string; data: Partial<NodeInput> }>;
    addConnections?: ConnectionInput[];
    removeConnections?: string[];
    updateWorkflowName?: string;
  }
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify workflow ownership
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId },
  });

  if (!workflow) {
    throw new Error("Workflow not found or unauthorized");
  }

  const results = {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesUpdated: 0,
    connectionsAdded: 0,
    connectionsRemoved: 0,
    workflowUpdated: false,
  };

  // Add new nodes
  if (changes.addNodes && changes.addNodes.length > 0) {
    const createdNodes = await Promise.all(
      changes.addNodes.map((node) =>
        prisma.node.create({
          data: {
            workflowId,
            type: node.type,
            name: node.name,
            position: node.position,
            data: node.data || {},
            credentialId: node.credentialId,
            agentType: node.agentType,
          },
        })
      )
    );
    results.nodesAdded = createdNodes.length;
  }

  // Remove nodes
  if (changes.removeNodes && changes.removeNodes.length > 0) {
    await prisma.node.deleteMany({
      where: {
        id: { in: changes.removeNodes },
        workflowId,
      },
    });
    results.nodesRemoved = changes.removeNodes.length;
  }

  // Update nodes
  if (changes.updateNodes && changes.updateNodes.length > 0) {
    await Promise.all(
      changes.updateNodes.map(({ id, data }) =>
        prisma.node.update({
          where: { id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.type && { type: data.type }),
            ...(data.position && { position: data.position }),
            ...(data.data && { data: data.data }),
            ...(data.credentialId !== undefined && {
              credentialId: data.credentialId,
            }),
            ...(data.agentType !== undefined && {
              agentType: data.agentType,
            }),
          },
        })
      )
    );
    results.nodesUpdated = changes.updateNodes.length;
  }

  // Add connections
  if (changes.addConnections && changes.addConnections.length > 0) {
    const createdConnections = await Promise.all(
      changes.addConnections.map((conn) =>
        prisma.connection.create({
          data: {
            workflowId,
            fromNodeId: conn.fromNodeId,
            toNodeId: conn.toNodeId,
            fromOutput: conn.fromOutput || "main",
            toInput: conn.toInput || "main",
          },
        })
      )
    );
    results.connectionsAdded = createdConnections.length;
  }

  // Remove connections
  if (changes.removeConnections && changes.removeConnections.length > 0) {
    await prisma.connection.deleteMany({
      where: {
        id: { in: changes.removeConnections },
        workflowId,
      },
    });
    results.connectionsRemoved = changes.removeConnections.length;
  }

  // Update workflow name
  if (changes.updateWorkflowName) {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { name: changes.updateWorkflowName },
    });
    results.workflowUpdated = true;
  }

  return results;
}

/**
 * Trigger background workflow generation with Inngest
 */
export async function triggerAIWorkflowGeneration(
  workflowId: string,
  userPrompt: string,
  conversationHistory?: Array<{ role: string; content: string }>
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Verify workflow ownership
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId },
  });

  if (!workflow) {
    throw new Error("Workflow not found or unauthorized");
  }

  // Trigger Inngest function
  const result = await inngest.send({
    name: "workflow/ai-generate",
    data: {
      workflowId,
      userPrompt,
      userId,
      conversationHistory,
    },
  });

  return { success: true, eventId: result.ids[0] };
}

/**
 * Get workflow as code (for showing to user what was generated)
 */
export async function getWorkflowAsCode(workflowId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId },
    include: {
      nodes: true,
      connections: true,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found or unauthorized");
  }

  // Generate TypeScript code representation
  const code = `
// Workflow: ${workflow.name}
// Generated: ${new Date().toISOString()}

export async function create${workflow.name.replace(/[^a-zA-Z0-9]/g, "")}Workflow() {
  const workflow = await prisma.workflow.create({
    data: {
      name: "${workflow.name}",
      userId: session.user.id,
      isDeveloper: ${workflow.isDeveloper},
    },
  });

  // Create nodes
  ${workflow.nodes
    .map(
      (node, i) => `
  const node${i} = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: NodeType.${node.type},
      name: "${node.name}",
      position: ${JSON.stringify(node.position)},
      data: ${JSON.stringify(node.data, null, 6)},
      ${node.credentialId ? `credentialId: "${node.credentialId}",` : ""}
    },
  });`
    )
    .join("\n")}

  // Create connections
  ${workflow.connections
    .map((conn) => {
      const fromIndex = workflow.nodes.findIndex((n) => n.id === conn.fromNodeId);
      const toIndex = workflow.nodes.findIndex((n) => n.id === conn.toNodeId);
      return `
  await prisma.connection.create({
    data: {
      workflowId: workflow.id,
      fromNodeId: node${fromIndex}.id,
      toNodeId: node${toIndex}.id,
      fromOutput: "${conn.fromOutput}",
      toInput: "${conn.toInput}",
    },
  });`;
    })
    .join("\n")}

  return workflow;
}
`;

  return code;
}
