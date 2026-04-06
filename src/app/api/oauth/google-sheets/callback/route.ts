import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            const errorDescription = searchParams.get("error_description") || "Unknown error";
            return NextResponse.redirect(
                new URL(
                    `/credentials/new?error=${encodeURIComponent(`OAuth failed: ${errorDescription}`)}`,
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                )
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL(
                    "/credentials/new?error=Invalid OAuth callback - missing code or state",
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                )
            );
        }

        const userId = state;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectUri = `${appUrl}/api/oauth/google-sheets/callback`;

        // Exchange authorization code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            return NextResponse.redirect(
                new URL(
                    `/credentials/new?error=${encodeURIComponent(`Token exchange failed: ${errorData.error_description || errorData.error}`)}`,
                    appUrl
                )
            );
        }

        const tokens = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokens;

        const credentialData = {
            access_token,
            refresh_token: refresh_token || null,
            expires_in,
            token_type: tokens.token_type || "Bearer",
            obtained_at: new Date().toISOString(),
        };

        const encryptedValue = await encrypt(JSON.stringify(credentialData));

        const credential = await prisma.credential.create({
            data: {
                name: `Google Sheets (OAuth - ${new Date().toLocaleDateString()})`,
                type: CredentialType.GOOGLE_SHEETS,
                value: encryptedValue,
                userId,
            },
        });

        return NextResponse.redirect(
            new URL(
                `/credentials/${credential.id}?success=Google Sheets connected successfully!`,
                appUrl
            )
        );
    } catch (error) {
        console.error("Google Sheets OAuth callback error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.redirect(
            new URL(
                `/credentials/new?error=${encodeURIComponent(`Google Sheets OAuth failed: ${errorMessage}`)}`,
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            )
        );
    }
}
