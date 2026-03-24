
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { NotionClient } from "@/lib/notion/client";

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const { agentId, query } = await req.json();

        if (!agentId) {
            return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
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
        console.error(`[Notion Search] Searching with query: "${query || ''}"`);

        let results = await client.search(query || "");
        console.error(`[Notion Search] Primary search found ${results.length} results`);

        // If no results and query is empty, specifically try to find databases
        // This helps if the default search ranking hides databases behind pages or nothing is returned
        if (results.length === 0 && (!query || query.trim() === "")) {
            console.error(`[Notion Search] No results, trying database fallback...`);
            const dbResults = await client.search("", "database");
            console.error(`[Notion Search] Database fallback found ${dbResults.length} results`);
            if (dbResults.length > 0) {
                results = dbResults;
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("Error searching Notion:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
