import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import type { Node, Edge } from "@xyflow/react";
import { NodeType } from "@/generated/prisma";

export const templatesRouter = createTRPCRouter({
  // Save workflow as community template (excludes credentials)
  saveToCommnunity: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).max(5).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the workflow
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Remove credentials from nodes
      const sanitizedNodes = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        name: node.name,
        agentType: node.agentType,
        position: node.position,
        data: node.data,
        // credentialId is excluded
      }));

      const connections = workflow.connections.map((conn) => ({
        fromNodeId: conn.fromNodeId,
        toNodeId: conn.toNodeId,
        fromOutput: conn.fromOutput,
        toInput: conn.toInput,
      }));

      // Create template
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const template = await prisma.workflowTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          tags: input.tags,
          nodes: sanitizedNodes,
          connections: connections,
          stickyNotes: (workflow as any).stickyNotes || null,
          createdById: ctx.auth.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return template;
    }),

  // Get all community templates
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const templates = await prisma.workflowTemplate.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return templates;
  }),

  // Use a template (creates a new workflow for the user)
  useTemplate: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.workflowTemplate.findUniqueOrThrow({
        where: { id: input.templateId },
      });

      // Create a new workflow from the template
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const workflow = await prisma.workflow.create({
        data: {
          name: `${template.name} (Copy)`,
          userId: ctx.auth.user.id,
          stickyNotes: template.stickyNotes as any,
        },
      });

      // Parse nodes and connections from template
      const templateNodes = template.nodes as any[];
      const templateConnections = template.connections as any[];

      // Create a mapping of old node IDs to new node IDs
      const nodeIdMap = new Map<string, string>();
      
      // Generate new IDs for all nodes
      const newNodes = templateNodes.map((node) => {
        const newId = crypto.randomUUID();
        nodeIdMap.set(node.id, newId);
        return {
          id: newId,
          workflowId: workflow.id,
          name: node.name,
          type: node.type as NodeType,
          agentType: node.agentType,
          position: node.position,
          data: node.data || {},
        };
      });

      // Update connections with new node IDs
      const newConnections = templateConnections.map((conn) => ({
        workflowId: workflow.id,
        fromNodeId: nodeIdMap.get(conn.fromNodeId) || conn.fromNodeId,
        toNodeId: nodeIdMap.get(conn.toNodeId) || conn.toNodeId,
        fromOutput: conn.fromOutput,
        toInput: conn.toInput,
      }));

      // Transaction to create nodes and connections
      await prisma.$transaction(async (tx) => {
        // Create nodes with new IDs
        await tx.node.createMany({
          data: newNodes,
        });

        // Create connections with updated node IDs
        await tx.connection.createMany({
          data: newConnections,
        });

        // Increment usage count
        await tx.workflowTemplate.update({
          where: { id: input.templateId },
          data: { usageCount: { increment: 1 } },
        });
      });

      return workflow;
    }),

  // Delete a template (only creator can delete)
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.workflowTemplate.delete({
        where: {
          id: input.id,
          createdById: ctx.auth.user.id,
        },
      });
    }),
});
