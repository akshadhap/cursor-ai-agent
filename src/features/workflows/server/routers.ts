import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import type { Node, Edge } from "@xyflow/react";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { NodeType } from "@/generated/prisma";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      await sendWorkflowExecution({
        workflowId: input.id,
      });

      return workflow;
    }),
  create: premiumProcedure.mutation(({ ctx }) => {
    if (!ctx.auth) throw new Error("Unauthorized: No auth context");
    const user = ctx.auth.user;

    return prisma.workflow.create({
      data: {
        name: generateSlug(3),
        // User is synced in context; just connect by unique email to avoid duplicate inserts
        user: {
          connect: { email: user.email },
        },
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.workflow.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      })
    }),
    update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any()).optional(),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
        // 👇 NEW: stickyNotes travels with the workflow
        stickyNotes: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
              text: z.string(),
            }),
          )
          .optional(),
      }),
    )

    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;

      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
      });

      // Transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {
        // Delete existing nodes and connections (cascade deletes connections)
        await tx.node.deleteMany({
          where: { workflowId: id },
        });

        // Create nodes
        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.type || "unknown",
            type: node.type as NodeType,
            position: node.position,
            data: node.data || {},
          })),
        });

        // Create connections
        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });

        // Update workflow's updateAt timestamp
        await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date(), stickyNotes: input.stickyNotes },
        });

        return workflow;
      });
    }),
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.workflow.update({
        where: { id: input.id, userId: ctx.auth.user.id },
        data: { name: input.name },
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const workflow = await prisma.workflow.findUnique({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: { nodes: true, connections: true , leads: {
      orderBy: { createdAt: "desc" },
    }, },
      });

      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      // Transform server nodes to react-flow compatible nodes
      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number, y: number },
        data: (node.data as Record<string, unknown>) || {},
      }));

      // Transform server connections to react-flow compatible edges
      // Transform server connections to react-flow compatible edges
const edges: Edge[] = workflow.connections.map((connection) => ({
  id: connection.id,
  source: connection.fromNodeId,
  target: connection.toNodeId,
  // If the DB just has the default "main", let React Flow use the default handle
  sourceHandle: connection.fromOutput === "main" ? undefined : connection.fromOutput,
  targetHandle: connection.toInput === "main" ? undefined : connection.toInput,
}));


      return {
        id: workflow.id,
        name: workflow.name,
         isDeveloper: workflow.isDeveloper,
        nodes,
        edges,
        leads: workflow.leads,
        stickyNotes: (workflow as any).stickyNotes ?? [],
      };
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { 
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            nodes: true,
            connections: true,
          },
        }),
        prisma.workflow.count({
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      // Transform workflows to include React Flow compatible nodes and edges
      const transformedItems = items.map((workflow) => ({
        ...workflow,
        flowNodes: workflow.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position as { x: number; y: number },
          data: (node.data as Record<string, unknown>) || {},
        })),
        flowEdges: workflow.connections.map((connection) => ({
          id: connection.id,
          source: connection.fromNodeId,
          target: connection.toNodeId,
          sourceHandle: connection.fromOutput === "main" ? undefined : connection.fromOutput,
          targetHandle: connection.toInput === "main" ? undefined : connection.toInput,
        })),
      }));

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items: transformedItems,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
