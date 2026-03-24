/**
 * LinkedIn Scheduler - Connections API
 * Fetch and manage LinkedIn connections for bulk messaging
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

interface Connection {
    id: string;
    name: string;
    headline?: string;
    profileUrl?: string;
    profilePicture?: string;
    status: "pending" | "messaged" | "replied" | "skipped";
    lastMessagedAt?: string;
    campaignId?: string;
}

// GET - Fetch connections from Unipile
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
        const refresh = searchParams.get("refresh") === "true";
        const limit = parseInt(searchParams.get("limit") || "100");
        const cursor = searchParams.get("cursor");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const accountId = config.unipileAccountId as string;

        if (!accountId) {
            return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
        }

        // Return cached connections unless refresh is requested
        if (!refresh && config.connections) {
            const cachedConnections = config.connections as Connection[];
            return NextResponse.json({
                success: true,
                connections: cachedConnections,
                total: cachedConnections.length,
                cached: true,
            });
        }

        // Fetch from Unipile API
        const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
        const baseUrl = `https://${dsn}/api/v1`;

        let url = `${baseUrl}/users/relations?account_id=${accountId}&limit=${limit}`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        const response = await fetch(url, {
            headers: {
                "X-API-KEY": process.env.UNIPILE_API_KEY || "",
            },
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("[Connections] Unipile error:", error);
            return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
        }

        const data = await response.json();
        const relations = data.items || [];

        // Map to our Connection structure
        const connections: Connection[] = relations.map((relation: Record<string, unknown>) => {
            const profile = (relation.profile || relation) as Record<string, unknown>;
            return {
                id: (relation.id || profile.id || profile.provider_id) as string,
                name: (profile.display_name || profile.name || profile.full_name || "Unknown") as string,
                headline: (profile.headline || profile.occupation) as string,
                profileUrl: (profile.url || profile.profile_url) as string,
                profilePicture: (profile.profile_picture_url || profile.picture) as string,
                status: "pending" as const,
            };
        });

        // Merge with existing connection statuses
        const existingConnections = (config.connections || []) as Connection[];
        const existingMap = new Map(existingConnections.map(c => [c.id, c]));

        const mergedConnections = connections.map(conn => ({
            ...conn,
            status: existingMap.get(conn.id)?.status || conn.status,
            lastMessagedAt: existingMap.get(conn.id)?.lastMessagedAt,
            campaignId: existingMap.get(conn.id)?.campaignId,
        }));

        // Save to agent config
        const updatedConfig = {
            ...config,
            connections: mergedConnections,
            lastConnectionsFetch: new Date().toISOString(),
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            connections: mergedConnections,
            total: mergedConnections.length,
            cursor: data.cursor,
            hasMore: !!data.cursor,
        });
    } catch (error) {
        console.error("[Connections] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get connections" },
            { status: 500 }
        );
    }
}

// POST - Update connection status
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
        const { agentId, connectionId, status, campaignId } = body;

        if (!agentId || !connectionId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const connections = (config.connections || []) as Connection[];

        const updatedConnections = connections.map(conn =>
            conn.id === connectionId
                ? {
                    ...conn,
                    status,
                    lastMessagedAt: status === "messaged" ? new Date().toISOString() : conn.lastMessagedAt,
                    campaignId: campaignId || conn.campaignId,
                }
                : conn
        );

        const updatedConfig = {
            ...config,
            connections: updatedConnections,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Connection status updated",
        });
    } catch (error) {
        console.error("[Connections] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update connection" },
            { status: 500 }
        );
    }
}
