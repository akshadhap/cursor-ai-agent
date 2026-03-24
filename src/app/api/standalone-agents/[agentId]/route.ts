import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.standaloneAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        config: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await req.json();

    // specific validation could go here

    // We do a deep merge of config on the client side or here?
    // For now, let's assume the client sends the specific fields to update in database
    // actually, prisma update will replace the JSON if we just pass it.
    // So we should probably fetch first or assume client sends full config?
    // Better: Client sends partial data, we merge it with existing config

    // Fetch current agent to merge config and data
    const currentAgent = await prisma.standaloneAgent.findUnique({
      where: { id: agentId },
      select: { config: true, data: true },
    });

    if (!currentAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const currentConfig = (currentAgent.config as Record<string, any>) || {};
    const newConfig = { ...currentConfig, ...body.config }; // Shallow merge of config root

    const currentData = (currentAgent.data as Record<string, any>) || {};
    const newData = body.data ? { ...currentData, ...body.data } : undefined; // Shallow merge of data root

    const updatedAgent = await prisma.standaloneAgent.update({
      where: { id: agentId },
      data: {
        ...body,
        config: body.config ? newConfig : undefined,
        data: newData !== undefined ? newData : undefined,
      },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
