import { NextRequest, NextResponse } from "next/server";
import { updateCursorAgentConfig } from "@/features/standalone-agents/agents/cursor-agent";
import { requireAuth } from "@/lib/auth-utils";

/**
 * POST /api/standalone-agents/cursor-agent/integrations
 * Save integration connection status
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, integration, connected, token, workspaceId, domain } = body;

        if (!agentId || !integration) {
            return NextResponse.json(
                { error: "agentId and integration are required" },
                { status: 400 }
            );
        }

        // Valid integrations
        const validIntegrations = ["notion", "slack", "jira"];
        if (!validIntegrations.includes(integration)) {
            return NextResponse.json(
                { error: `Invalid integration. Must be one of: ${validIntegrations.join(", ")}` },
                { status: 400 }
            );
        }

        // Build integration config
        const integrationConfig: any = {
            connected: connected ?? false,
        };

        if (token) integrationConfig.token = token;
        if (workspaceId) integrationConfig.workspaceId = workspaceId;
        if (domain) integrationConfig.domain = domain;

        // Update agent configuration
        const result = await updateCursorAgentConfig(agentId, {
            integrations: {
                [integration]: integrationConfig,
            },
        });

        return NextResponse.json({ success: true, agent: result });
    } catch (error: any) {
        console.error("Error updating integration:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update integration" },
            { status: 500 }
        );
    }
}
