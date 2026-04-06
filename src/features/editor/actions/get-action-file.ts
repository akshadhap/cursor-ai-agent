"use server";

import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

/**
 * Get the generated action file for a workflow
 */
export async function getGeneratedActionFile(workflowId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId },
    select: { stickyNotes: true, name: true },
  });

  if (!workflow) {
    throw new Error("Workflow not found or unauthorized");
  }

  const metadata = workflow.stickyNotes as any;
  
  if (!metadata?.actionFile) {
    return {
      success: false,
      message: "No action file has been generated for this workflow yet",
    };
  }

  return {
    success: true,
    actionFile: metadata.actionFile,
    generatedAt: metadata.generatedAt,
    workflowName: workflow.name,
  };
}

/**
 * Download the action file as a .ts file
 */
export async function downloadActionFile(workflowId: string) {
  const result = await getGeneratedActionFile(workflowId);
  
  if (!result.success) {
    throw new Error(result.message);
  }

  const fileName = `${result.workflowName
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-action.ts`;

  return {
    fileName,
    content: result.actionFile,
  };
}
