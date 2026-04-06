import { NextRequest, NextResponse } from "next/server";
import { saveCursorAgentActivity, getCursorAgentActivity } from "@/features/standalone-agents/agents/cursor-agent";
import { requireAuth } from "@/lib/auth-utils";

/**
 * POST /api/standalone-agents/cursor-agent/activity
 * Save activity from extension
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, type, details, url, timestamp } = body;

        // Validation
        if (!agentId || !type || !details || !timestamp) {
            return NextResponse.json(
                { error: "Missing required fields: agentId, type, details, timestamp" },
                { status: 400 }
            );
        }

        // Valid action types
        const validTypes = ["chat", "summarize", "explain", "task", "email", "scrape", "enrich"];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
                { status: 400 }
            );
        }

        // Save activity
        const result = await saveCursorAgentActivity(agentId, {
            type,
            details,
            url,
            timestamp,
        });

        return NextResponse.json({ success: true, agent: result });
    } catch (error: any) {
        console.error("Error saving activity:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save activity" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/standalone-agents/cursor-agent/activity?agentId=xxx&limit=50&type=chat
 * Get activity log
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const limit = searchParams.get("limit");
        const type = searchParams.get("type");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        const options: any = {};
        if (limit) options.limit = parseInt(limit);
        if (type) options.type = type;
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;

        const activities = await getCursorAgentActivity(agentId, options);

        return NextResponse.json({ success: true, activities });
    } catch (error: any) {
        console.error("Error fetching activity:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch activity" },
            { status: 500 }
        );
    }
}
