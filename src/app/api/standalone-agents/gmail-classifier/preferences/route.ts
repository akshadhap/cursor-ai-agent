
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    try {
        const { user } = await requireAuth();

        // Ensure we have the real DB user ID
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const agent = await prisma.standaloneAgent.findUnique({
            where: {
                userId_type: {
                    userId: dbUser.id,
                    type: "GMAIL_CLASSIFIER"
                }
            },
            select: { config: true }
        });

        const config = (agent?.config as any) || {};
        return NextResponse.json({
            syncPreferences: config.syncPreferences || {},
            corrections: config.corrections || []
        });
    } catch (error: any) {
        console.error("[Preferences API] Error fetching preferences:", error);
        return NextResponse.json(
            { error: "Failed to fetch preferences" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user } = await requireAuth();

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = dbUser.id;
        console.log(`[Preferences API] Saving prefs for user: ${user.email} (DB ID: ${userId})`);

        const body = await req.json();
        const { syncPreferences } = body;

        if (!syncPreferences) {
            return NextResponse.json(
                { error: "No preferences provided" },
                { status: 400 }
            );
        }

        // Fetch existing config to merge
        const existingAgent = await prisma.standaloneAgent.findUnique({
            where: {
                userId_type: {
                    userId,
                    type: "GMAIL_CLASSIFIER"
                }
            },
            select: { config: true }
        });

        const currentConfig = (existingAgent?.config as any) || {};
        const newConfig = {
            ...currentConfig,
            syncPreferences
        };

        const updatedAgent = await prisma.standaloneAgent.upsert({
            where: {
                userId_type: {
                    userId,
                    type: "GMAIL_CLASSIFIER"
                }
            },
            create: {
                userId,
                name: "Email Classifier",
                type: "GMAIL_CLASSIFIER",
                status: "ACTIVE",
                config: newConfig
            },
            update: {
                config: newConfig
            }
        });

        console.log("[Preferences API] Preferences saved successfully");
        return NextResponse.json({
            syncPreferences: (updatedAgent.config as any).syncPreferences
        });
    } catch (error: any) {
        console.error("[Preferences API] Error saving preferences:", error);
        return NextResponse.json(
            { error: "Failed to save preferences", details: error.message },
            { status: 500 }
        );
    }
}
