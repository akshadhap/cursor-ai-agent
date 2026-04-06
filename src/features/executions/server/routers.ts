import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";

export const executionsRouter = createTRPCRouter({
  getTotalTokens: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth) throw new Error("Unauthorized: No auth context");
    
    const executions = await prisma.execution.findMany({
      where: {
        OR: [
          { userId: ctx.auth.user.id },
          {
            userId: null,
            workflow: {
              userId: ctx.auth.user.id,
            },
          },
        ],
      },
      select: {
        id: true,
        executedNodes: true,
      },
    });

    let totalTokens = 0;
    let debugInfo = { executionsCount: executions.length, nodesProcessed: 0, tokensFound: 0 };
    
    for (const execution of executions) {
      if (execution.executedNodes && Array.isArray(execution.executedNodes)) {
        debugInfo.nodesProcessed += execution.executedNodes.length;
        for (const node of execution.executedNodes as any[]) {
          if (node.tokens && typeof node.tokens === 'number') {
            debugInfo.tokensFound++;
            totalTokens += node.tokens;
          }
        }
      }
    }

    console.log('Token calculation debug:', debugInfo, 'Total tokens:', totalTokens);
    return { totalTokens };
  }),
  hasRunningExecutions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth) throw new Error("Unauthorized: No auth context");
    
    const count = await prisma.execution.count({
      where: {
        status: "RUNNING",
        OR: [
          { userId: ctx.auth.user.id },
          {
            userId: null,
            workflow: {
              userId: ctx.auth.user.id,
            },
          },
        ],
      },
    });
    
    return { hasRunning: count > 0 };
  }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      
      const execution = await prisma.execution.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              userId: true,
              nodes: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  agentType: true,
                },
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },
        },
      });

      // Check authorization
      const ownerUserId = execution.userId || execution.workflow?.userId;
      if (ownerUserId !== ctx.auth.user.id) {
        throw new Error("Unauthorized: You don't have access to this execution");
      }

      return execution;
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      
      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { 
            OR: [
              { userId: ctx.auth.user.id },
              {
                userId: null,
                workflow: {
                  userId: ctx.auth.user.id,
                },
              },
            ],
          },
          orderBy: {
            startedAt: "desc",
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.execution.count({
          where: {
            OR: [
              { userId: ctx.auth.user.id },
              {
                userId: null,
                workflow: {
                  userId: ctx.auth.user.id,
                },
              },
            ],
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
