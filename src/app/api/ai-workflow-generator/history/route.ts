import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Get chat history for a workflow
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id as string;
    
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return new Response("Missing workflowId", { status: 400 });
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    // Get all messages for this workflow, ordered by sequence for guaranteed order
    let messages: any[] = [];
    try {
      messages = await prisma.aIConversationMessage.findMany({
        where: { workflowId },
        orderBy: [
          { sequence: "asc" },
          { createdAt: "asc" },
        ],
      });
    } catch (err: any) {
      // If the table is missing (migration not applied), just return empty history
      if (err?.code === "P2021" || /does not exist/i.test(err?.message || "")) {
        console.warn("AIConversationMessage table missing; returning empty history");
        messages = [];
      } else {
        throw err;
      }
    }

    // Format messages for frontend
    const history = messages.map((msg) => ({
      id: msg.id,
      role: msg.role.toLowerCase(),
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      sequence: msg.sequence,
      metadata: msg.metadata,
    }));

    return Response.json({ history });
  } catch (error) {
    console.error("History API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
