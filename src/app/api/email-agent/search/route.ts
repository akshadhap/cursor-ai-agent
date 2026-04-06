import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import { searchEmails } from "@/lib/email-agent/embedding-service";
import prisma from "@/lib/db";

/**
 * Semantic Search API for emails
 * POST /api/email-agent/search
 * 
 * Body: { query: string, filters?: { category, priority, fromDomain } }
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get actual user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { query, filters = {}, topK = 10 } = body;

        if (!query || typeof query !== "string") {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        console.log(`[Search] User: ${user.email}, Query: "${query}"`);

        // Perform semantic search
        const results = await searchEmails(query, user.id, {
            topK,
            ...filters,
        });

        return NextResponse.json({
            results,
            query,
            count: results.length,
        });

    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Search failed" },
            { status: 500 }
        );
    }
}
