"use server";

import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

/**
 * Load chat history for a workflow
 */
export async function loadChatHistory(workflowId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, userId },
    select: { stickyNotes: true },
  });

  const metadata = (workflow?.stickyNotes as any) || {};
  const chatHistory = metadata.chatHistory || [];

  return chatHistory;
}
