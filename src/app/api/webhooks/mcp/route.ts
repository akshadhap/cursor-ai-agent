import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const workflowId = url.searchParams.get("workflowId");

        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: "Missing required query parameter: workflowId" },
                { status: 400 },
            );
        }

        const body = await request.json().catch(() => ({}));

        // Structure MCP event data
        const mcpPayload = {
            eventType: body.eventType || "unknown",
            serverName: body.serverName || "unknown",
            data: body.data || body,
            timestamp: body.timestamp || new Date().toISOString(),
            raw: body,
        };

        await sendWorkflowExecution({
            workflowId,
            initialData: {
                mcp: mcpPayload,  // Available as {{mcp.eventType}}, {{mcp.serverName}}, etc.
            },
        });

        return NextResponse.json(
            { success: true, message: "MCP event received and workflow triggered" },
            { status: 200 },
        );
    } catch (error) {
        console.error("MCP webhook trigger error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to process MCP webhook" },
            { status: 500 },
        );
    }
}

// Also support GET for testing/verification
export async function GET() {
    return NextResponse.json({
        name: "MCP Webhook Trigger",
        method: "POST",
        description: "Send MCP events to trigger workflows",
        expectedPayload: {
            eventType: "string (optional)",
            serverName: "string (optional)",
            data: "object (optional)",
            timestamp: "ISO string (optional)",
        },
    });
}
