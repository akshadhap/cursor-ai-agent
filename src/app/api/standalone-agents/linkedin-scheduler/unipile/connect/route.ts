import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * Unipile - Connect LinkedIn Account API Route
 * Initiates LinkedIn connection via Unipile Hosted Auth
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Unipile API uses DSN-based URLs like https://api1.unipile.com:13111/api/v1
// The DSN should be provided in the Unipile dashboard
const getUnipileBaseUrl = () => {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    return `https://${dsn}/api/v1`;
};

// GET - Get connect URL / check connection status
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                error: "Unipile API key not configured",
                instructions: "Add UNIPILE_API_KEY and UNIPILE_DSN to your .env file. Get these from your Unipile dashboard."
            }, { status: 500 });
        }

        // Check if already connected
        const config = agent.config as Record<string, unknown> || {};
        const unipileAccountId = config.unipileAccountId as string;

        if (unipileAccountId) {
            // Verify connection is still valid
            try {
                const baseUrl = getUnipileBaseUrl();
                const verifyResponse = await fetch(
                    `${baseUrl}/accounts/${unipileAccountId}`,
                    {
                        headers: {
                            "X-API-KEY": apiKey,
                            "Accept": "application/json",
                        },
                    }
                );

                if (verifyResponse.ok) {
                    const accountData = await verifyResponse.json();
                    return NextResponse.json({
                        connected: true,
                        accountId: unipileAccountId,
                        accountName: accountData.name || accountData.identifier || "LinkedIn Account",
                    });
                }
            } catch (error) {
                console.error("[Unipile Connect] Verify error:", error);
            }
        }

        // Get hosted auth link from Unipile
        const baseUrl = getUnipileBaseUrl();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        logger.info(`[Unipile Connect] Creating hosted auth link at: ${baseUrl}/hosted/accounts/link`);
        logger.info(`[Unipile Connect] Using DSN: ${process.env.UNIPILE_DSN || 'DEFAULT'}`);
        logger.info(`[Unipile Connect] API Key present: ${!!apiKey}`);
        logger.info(`[Unipile Connect] App URL: ${appUrl}`);

        const requestBody = {
            type: "create",
            providers: ["LINKEDIN"],
            api_url: baseUrl, // Point to Unipile API, not our app
            expiresOn: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            success_redirect_url: `${appUrl}/api/standalone-agents/linkedin-scheduler/unipile/callback?agentId=${agentId}`,
            failure_redirect_url: `${appUrl}/cognitive-agents/${agentId}?error=connection_failed`,
            // Removed notify_url - using cron jobs instead of webhooks for inbox/comments monitoring
        };

        logger.info("[Unipile Connect] Request body:", JSON.stringify(requestBody, null, 2));

        let response: Response;
        try {
            response = await fetch(`${baseUrl}/hosted/accounts/link`, {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKey,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(requestBody),
            });
        } catch (fetchError) {
            // Network-level error - cannot reach the server
            console.error("[Unipile Connect] FETCH FAILED - Network Error:", fetchError);
            console.error("[Unipile Connect] Target URL:", `${baseUrl}/hosted/accounts/link`);
            console.error("[Unipile Connect] This usually means:");
            console.error("  1. UNIPILE_DSN is incorrect (should be like 'api1.unipile.com:13111')");
            console.error("  2. Network/firewall is blocking outbound requests");
            console.error("  3. DNS resolution failed for the Unipile domain");

            return NextResponse.json(
                {
                    error: "Cannot connect to Unipile API. Network error.",
                    details: fetchError instanceof Error ? fetchError.message : "Unknown network error",
                    targetUrl: `${baseUrl}/hosted/accounts/link`,
                    dsnConfigured: process.env.UNIPILE_DSN || "DEFAULT",
                },
                { status: 500 }
            );
        }

        const responseText = await response.text();
        logger.info(`[Unipile Connect] Response: ${response.status}`, responseText);

        if (!response.ok) {
            console.error(`[Unipile Connect] Error: ${response.status}`, responseText);

            // Try parsing error for better message
            try {
                const errorData = JSON.parse(responseText);
                return NextResponse.json(
                    {
                        error: errorData.title || "Failed to get connect URL",
                        details: errorData.type || response.status
                    },
                    { status: response.status }
                );
            } catch {
                return NextResponse.json(
                    { error: "Failed to get connect URL", status: response.status },
                    { status: response.status }
                );
            }
        }

        const data = JSON.parse(responseText);
        logger.info(`[Unipile Connect] Got hosted link for agent: ${agentId}`);

        return NextResponse.json({
            connected: false,
            connectUrl: data.url,
        });
    } catch (error) {
        console.error("[Unipile Connect] Unexpected Error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Connection failed",
                type: "unexpected_error"
            },
            { status: 500 }
        );
    }
}

// POST - Manually set account ID (for users who already connected via Unipile dashboard)
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { agentId, accountId } = body;

        if (!agentId || !accountId) {
            return NextResponse.json({ error: "Missing agentId or accountId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Save account ID to agent config
        const config = agent.config as Record<string, unknown> || {};

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: {
                    ...config,
                    unipileAccountId: accountId,
                    // Set trial start date if not already set
                    trialStartDate: config.trialStartDate || new Date().toISOString(),
                },
            },
        });

        logger.info(`[Unipile Connect] Saved account ${accountId} for agent ${agentId}`);

        return NextResponse.json({ success: true, accountId });
    } catch (error) {
        console.error("[Unipile Connect] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Save failed" },
            { status: 500 }
        );
    }
}
