import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// GET config
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const searchParams = req.nextUrl.searchParams;
        const agentId = searchParams.get("agentId");

        if (!agentId) return NextResponse.json({ error: "Agent ID required" }, { status: 400 });

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true }
        });

        if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

        return NextResponse.json({ config: agent.config });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE config
export async function PATCH(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const { agentId, autoCreateJiraTasks, jiraProjectKey } = body;

        if (!agentId) return NextResponse.json({ error: "Agent ID required" }, { status: 400 });

        // Get existing config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId }
        });

        if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

        const currentConfig = (agent.config as any) || {};

        // Update persistent settings
        const newConfig = {
            ...currentConfig,
            autoCreateJiraTasks: autoCreateJiraTasks ?? currentConfig.autoCreateJiraTasks,
            jiraProjectKey: jiraProjectKey ?? currentConfig.jiraProjectKey
        };

        const updatedAgent = await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: { config: newConfig }
        });

        return NextResponse.json({ success: true, config: updatedAgent.config });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

