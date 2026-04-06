/**
 * Rescue Email API
 * Moves an email from SPAM to INBOX
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, emailId } = body;

        if (!agentId || !emailId) {
            return NextResponse.json(
                { error: "agentId and emailId are required" },
                { status: 400 }
            );
        }

        // Get agent config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentConfig = agent.config as any;
        const accessToken = agentConfig?.accessToken;

        if (!accessToken) {
            return NextResponse.json(
                { error: "Gmail not connected" },
                { status: 400 }
            );
        }

        console.log(`[Rescue Email] Moving email ${emailId} from SPAM to INBOX`);

        // Use Gmail API to modify labels
        // Remove SPAM label and add INBOX label
        const modifyUrl = `${GMAIL_API_BASE}/users/me/messages/${emailId}/modify`;

        const response = await fetch(modifyUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                addLabelIds: ['INBOX'],
                removeLabelIds: ['SPAM'],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[Rescue Email] Gmail API error:", error);
            return NextResponse.json(
                { error: error.error?.message || "Failed to move email" },
                { status: response.status }
            );
        }

        const result = await response.json();
        console.log(`[Rescue Email] Successfully moved email ${emailId} to INBOX`);

        return NextResponse.json({
            success: true,
            message: "Email moved to inbox",
            emailId: result.id,
            newLabels: result.labelIds,
        });
    } catch (error) {
        console.error("[Rescue Email] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
