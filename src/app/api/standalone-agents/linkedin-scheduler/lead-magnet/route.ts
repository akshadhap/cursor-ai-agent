import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Lead Magnet API
 * Comment-to-DM automation for lead generation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Lead Magnet configuration
export interface LeadMagnet {
    id: string;
    name: string;
    keyword: string;          // Trigger keyword in comments
    postUrl: string;          // LinkedIn post URL to monitor
    publicReply: string;      // Public reply to the comment
    dmMessage: string;        // Private DM message
    attachmentUrl?: string;   // Optional PDF or file URL
    enabled: boolean;
    createdAt: string;
    triggeredCount: number;   // How many times triggered
}

// Extract post ID from LinkedIn URL
function extractPostId(url: string): string | null {
    if (!url) return null;
    // Handle various LinkedIn URL formats
    // Format: https://www.linkedin.com/posts/username_activity-7416267349093220352
    // Or: https://www.linkedin.com/feed/update/urn:li:activity:7416267349093220352
    // Or just the ID: 7416267349093220352

    const activityMatch = url.match(/activity[-:]?(\d+)/);
    if (activityMatch) return activityMatch[1];

    const idMatch = url.match(/(\d{19})/);
    if (idMatch) return idMatch[1];

    return url; // Return as-is if it's already an ID
}

// GET - List all lead magnets for an agent
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

        const config = (agent.config as Record<string, unknown>) || {};
        const leadMagnets = (config.leadMagnets || []) as LeadMagnet[];

        return NextResponse.json({
            success: true,
            leadMagnets,
        });
    } catch (error) {
        console.error("[Lead Magnet] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get lead magnets" },
            { status: 500 }
        );
    }
}

// POST - Create or update a lead magnet
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
        const { agentId, leadMagnet } = body;

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        if (!leadMagnet?.keyword || !leadMagnet?.postUrl || !leadMagnet?.publicReply || !leadMagnet?.dmMessage) {
            return NextResponse.json({ error: "Missing required fields: keyword, postUrl, publicReply, dmMessage" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const existingLeadMagnets = (config.leadMagnets || []) as LeadMagnet[];

        let updatedLeadMagnets: LeadMagnet[];
        let isUpdate = false;

        if (leadMagnet.id) {
            // Update existing lead magnet
            isUpdate = true;
            updatedLeadMagnets = existingLeadMagnets.map((lm) =>
                lm.id === leadMagnet.id
                    ? {
                        ...lm,
                        name: leadMagnet.name || lm.name,
                        keyword: leadMagnet.keyword,
                        publicReply: leadMagnet.publicReply,
                        dmMessage: leadMagnet.dmMessage,
                        attachmentUrl: leadMagnet.attachmentUrl,
                        postUrl: leadMagnet.postUrl || lm.postUrl,
                        enabled: leadMagnet.enabled ?? lm.enabled,
                    }
                    : lm
            );
        } else {
            // Create new lead magnet
            const newLeadMagnet: LeadMagnet = {
                id: `lm_${Date.now()}`,
                name: leadMagnet.name || `Lead Magnet - ${leadMagnet.keyword}`,
                keyword: leadMagnet.keyword.toLowerCase(),
                postUrl: leadMagnet.postUrl,
                publicReply: leadMagnet.publicReply,
                dmMessage: leadMagnet.dmMessage,
                attachmentUrl: leadMagnet.attachmentUrl,
                enabled: true,
                createdAt: new Date().toISOString(),
                triggeredCount: 0,
            };
            updatedLeadMagnets = [...existingLeadMagnets, newLeadMagnet];
        }

        // Sync to postAutomations format for cron job compatibility
        const postAutomations = updatedLeadMagnets
            .filter(lm => lm.enabled && lm.postUrl)
            .map(lm => {
                const postId = extractPostId(lm.postUrl);
                return {
                    postId: postId || lm.postUrl,
                    postUrl: lm.postUrl,
                    postText: "",
                    keywords: [lm.keyword],
                    publicReply: lm.publicReply,
                    dmMessage: lm.dmMessage,
                    attachmentUrl: lm.attachmentUrl,
                    enabled: lm.enabled,
                    triggeredCount: lm.triggeredCount,
                    sourceLeadMagnetId: lm.id,
                };
            });

        logger.info(`[Lead Magnet] Synced ${postAutomations.length} lead magnets to postAutomations`);
        logger.info(`[Lead Magnet] Post IDs:`, postAutomations.map(p => p.postId).join(', '));

        const updatedConfig = {
            ...config,
            leadMagnets: updatedLeadMagnets,
            postAutomations, // Add for cron compatibility
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            message: isUpdate ? "Lead magnet updated" : "Lead magnet created",
            leadMagnets: updatedLeadMagnets,
        });
    } catch (error) {
        console.error("[Lead Magnet] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to save lead magnet" },
            { status: 500 }
        );
    }
}

// DELETE - Remove a lead magnet
export async function DELETE(req: NextRequest) {
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
        const { agentId, leadMagnetId } = body;

        if (!agentId || !leadMagnetId) {
            return NextResponse.json({ error: "Missing agentId or leadMagnetId" }, { status: 400 });
        }

        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const config = (agent.config as Record<string, unknown>) || {};
        const existingLeadMagnets = (config.leadMagnets || []) as LeadMagnet[];

        const updatedLeadMagnets = existingLeadMagnets.filter((lm) => lm.id !== leadMagnetId);

        const updatedConfig = {
            ...config,
            leadMagnets: updatedLeadMagnets,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: JSON.parse(JSON.stringify(updatedConfig)),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Lead magnet deleted",
            leadMagnets: updatedLeadMagnets,
        });
    } catch (error) {
        console.error("[Lead Magnet] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete lead magnet" },
            { status: 500 }
        );
    }
}
