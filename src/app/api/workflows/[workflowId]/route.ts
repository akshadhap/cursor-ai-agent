import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id as string;
    const { workflowId } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
        userId,
      },
      select: {
        id: true,
        name: true,
        stickyNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to fetch workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}
