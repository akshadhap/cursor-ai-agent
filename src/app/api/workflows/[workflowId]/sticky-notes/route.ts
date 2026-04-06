// app/api/workflows/[workflowId]/sticky-notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const { workflowId } = await params;

  const body = await req.json();
  const stickyNotes = body.stickyNotes ?? [];

  await prisma.workflow.update({
    where: {
      id: workflowId,
      userId, // safety: only owner can update
    },
    data: {
      stickyNotes,
    },
  });

  return NextResponse.json({ ok: true });
}
