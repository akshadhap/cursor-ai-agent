import prisma from "@/lib/db";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { encrypt } from "@/lib/encryption";

export const credentialsRouter = createTRPCRouter({
  create: premiumProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.nativeEnum(CredentialType),
        value: z.string().min(1, "Value is required")
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, value, type } = input;

      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.credential.create({
        data: {
          name,
          userId: ctx.auth.user.id,
          type,
          value: await encrypt(value),
        },
      });
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.credential.delete({
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
        name: z.string().min(1, "Name is required"),
        type: z.nativeEnum(CredentialType),
        value: z.string().min(1, "Value is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, type, value } = input;

      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.credential.update({
        where: { id, userId: ctx.auth.user.id },
        data: {
          name,
          type,
          value: await encrypt(value),
        }
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.credential.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
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
        prisma.credential.findMany({
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
        }),
        prisma.credential.count({
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
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
    getAll: protectedProcedure
        .query(async ({ ctx }) => {
          if (!ctx.auth) throw new Error("Unauthorized: No auth context");
          const items = await prisma.credential.findMany({
            where: {
              userId: ctx.auth.user.id,
            },
            orderBy: {
              updatedAt: "desc",
            },
          });
          return { items };
        }),
  getByType: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(CredentialType),
      })
    )
    .query(({ input, ctx }) => {
      const { type } = input;
      if (!ctx.auth) throw new Error("Unauthorized: No auth context");
      return prisma.credential.findMany({
        where: { type, userId: ctx.auth!.user.id },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),
});
