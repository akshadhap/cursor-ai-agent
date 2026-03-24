import { NextRequest, NextResponse } from "next/server";
import { getCursorAgentAnalytics } from "@/features/standalone-agents/agents/cursor-agent";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/standalone-agents/cursor-agent/analytics?agentId=xxx
 * Get analytics data for dashboard
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        const analytics = await getCursorAgentAnalytics(agentId);

        return NextResponse.json({ success: true, analytics });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
