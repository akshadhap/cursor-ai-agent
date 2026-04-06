import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/gmail/oauth";
import { getGmailProfile, getGoogleUserInfo } from "@/lib/gmail/client";

/**
 * Gmail OAuth Callback
 * Handles the OAuth callback from Google
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        console.log("[OAuth Callback] Received callback", { code: !!code, state: !!state, error });

        // Get the base URL for redirects (production URL in production, localhost otherwise)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (error) {
            console.error("[OAuth Callback] OAuth error:", error);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            console.error("[OAuth Callback] Missing code or state");
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=missing_params`);
        }

        // Decode state to get agentId and provider
        const { agentId, provider } = JSON.parse(Buffer.from(state, "base64").toString());
        console.log("[OAuth Callback] Decoded state:", { agentId, provider });

        // Get current agent to merge config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
            select: { config: true, data: true },
        });

        if (!agent) {
            console.error("[OAuth Callback] Agent not found:", agentId);
            return NextResponse.redirect(`${appUrl}/cognitive-agents?error=agent_not_found`);
        }

        console.log("[OAuth Callback] Found agent, current config:", agent.config);

        const currentConfig = (agent.config as any) || {};
        const currentData = (agent.data as any) || {};

        // Exchange code for tokens
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/standalone-agents/gmail-classifier/oauth-callback`;

        console.log("[OAuth Callback] Exchanging code for tokens...");
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        // Get Gmail profile (Email)
        console.log("[OAuth Callback] Getting Gmail profile...");
        const profile = await getGmailProfile(tokens.access_token);
        console.log("[OAuth Callback] Gmail profile:", profile.emailAddress);

        // Get Google User Info (Name, Picture)
        console.log("[OAuth Callback] Getting Google User Info...");
        let userInfo = { name: "", picture: "" };
        try {
            const userProfile = await getGoogleUserInfo(tokens.access_token);
            userInfo = {
                name: userProfile.name,
                picture: userProfile.picture
            };
            console.log("[OAuth Callback] User Info:", userInfo);
        } catch (e) {
            console.warn("[OAuth Callback] Failed to get user info (optional scope might be missing)", e);
        }

        // Merge with existing config
        const updatedConfig = {
            ...currentConfig,
            gmailEmail: profile.emailAddress,
            gmailProfileName: userInfo.name,
            gmailProfilePicture: userInfo.picture,
            emailProvider: provider || 'gmail',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        };

        // Merge with existing data
        const updatedData = {
            ...currentData,
            gmailConnected: true,
            connectedAt: new Date().toISOString(),
            gmailEmail: profile.emailAddress,
            emails: currentData.emails || [],
            stats: currentData.stats || {
                total: 0,
                classified: 0,
                splSuppressed: 0,
                llmCalled: 0,
                categories: {},
            },
        };

        console.log("[OAuth Callback] Updating agent with config:", updatedConfig);

        // Update agent with Gmail credentials - FIX: Prisma JSON fields need explicit typing
        const updated = await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                config: updatedConfig as any,
                data: updatedData as any,
            },
        });

        console.log("[OAuth Callback] Agent updated successfully!");

        // Redirect back to agent page (email dashboard)
        return NextResponse.redirect(`${appUrl}/cognitive-agents/${agentId}?connected=true`);
    } catch (error) {
        console.error("[OAuth Callback] Error:", error);
        const errorAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return NextResponse.redirect(`${errorAppUrl}/cognitive-agents?error=oauth_failed`);
    }
}
