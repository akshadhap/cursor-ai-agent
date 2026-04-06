
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { NotionClient } from "@/lib/notion/client";

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const { agentId, title, content, parentId, parentType } = await req.json();

        if (!agentId || !title || !parentId || !parentType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId, userId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = agent.config as any;
        const accessToken = config?.notionAccessToken;

        if (!accessToken) {
            return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
        }

        const client = new NotionClient(accessToken);
        const result = await client.createPageWithParentType(title, content, parentId, parentType);

        return NextResponse.json({ success: true, pageId: result.id, url: result.url });
    } catch (error: any) {
        console.error("Error creating Notion page:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
