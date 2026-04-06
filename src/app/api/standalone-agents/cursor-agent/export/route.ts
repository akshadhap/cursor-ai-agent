import { NextRequest, NextResponse } from "next/server";
import { getCursorAgent } from "@/features/standalone-agents/agents/cursor-agent";
import { requireAuth } from "@/lib/auth-utils";

/**
 * POST /api/standalone-agents/cursor-agent/export
 * Export extension package with user configuration
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId } = body;

        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        // Get agent configuration
        const agent = await getCursorAgent(agentId);
        const config = agent.config as any;

        // Generate download URL
        // In production, this would generate a ZIP file with the extension
        // For now, we'll return the configuration that the extension can use
        const exportData = {
            agentId: agent.id,
            userId: agent.userId,
            config: config,
            exportedAt: new Date().toISOString(),
            // Extension will use this to configure itself
            manifest: {
                name: "Spinabot Cursor AI",
                version: "1.0.0",
                description: "AI-powered cursor assistance",
                permissions: ["activeTab", "contextMenus", "storage", "scripting"],
                host_permissions: [
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
                    "https://*/*",
                ],
            },
            // Backend URL for extension to connect to
            backendUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
        };

        return NextResponse.json({
            success: true,
            exportData,
            downloadUrl: `/api/standalone-agents/cursor-agent/download?agentId=${agentId}`,
        });
    } catch (error: any) {
        console.error("Error exporting extension:", error);
        return NextResponse.json(
            { error: error.message || "Failed to export extension" },
            { status: 500 }
        );
    }
}
