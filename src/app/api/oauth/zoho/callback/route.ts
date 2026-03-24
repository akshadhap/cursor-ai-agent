import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { getPublicBaseUrl } from "@/lib/publicBaseUrl";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const baseUrl = getPublicBaseUrl(request);

    // Get auth session
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent("Not authenticated")}`, baseUrl)
        );
    }

    // Handle OAuth errors from Zoho
    if (error) {
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent(`Zoho OAuth error: ${error}`)}`, baseUrl)
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent("Missing authorization code or state")}`, baseUrl)
        );
    }

    // Verify state cookie
    const stateCookie = request.cookies.get("zoho_oauth_state")?.value;
    if (!stateCookie || stateCookie !== state) {
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent("Invalid state - possible CSRF attack")}`, baseUrl)
        );
    }

    // Decode state
    let stateData: { name: string; region: string; clientId: string; clientSecret: string };
    try {
        stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    } catch {
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent("Invalid state data")}`, baseUrl)
        );
    }

    const { name, region, clientId, clientSecret } = stateData;

    // Map region to Zoho accounts domain
    const regionToDomain: Record<string, string> = {
        com: "accounts.zoho.com",
        eu: "accounts.zoho.eu",
        in: "accounts.zoho.in",
        "com.au": "accounts.zoho.com.au",
        "com.cn": "accounts.zoho.com.cn",
        jp: "accounts.zoho.jp",
    };

    const accountsDomain = regionToDomain[region] || "accounts.zoho.com";
    const redirectUri = `${baseUrl}/api/oauth/zoho/callback`;

    // Exchange authorization code for tokens
    try {
        const tokenUrl = `https://${accountsDomain}/oauth/v2/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Zoho token exchange failed:", errorText);
            return NextResponse.redirect(
                new URL(`/credentials/new?error=${encodeURIComponent("Failed to exchange code for tokens")}`, baseUrl)
            );
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.refresh_token) {
            console.error("No refresh token in response:", tokenData);
            return NextResponse.redirect(
                new URL(`/credentials/new?error=${encodeURIComponent("No refresh token received. Make sure you have offline access enabled.")}`, baseUrl)
            );
        }

        // Create credential with the refresh token
        const credentialValue = JSON.stringify({
            region,
            clientId,
            clientSecret,
            refreshToken: tokenData.refresh_token,
        });

        const credential = await prisma.credential.create({
            data: {
                name,
                type: CredentialType.ZOHO_CRM,
                value: credentialValue,
                userId: session.user.id,
            },
        });

        // Clear the state cookie
        const response = NextResponse.redirect(
            new URL(`/credentials/${credential.id}?success=${encodeURIComponent("Successfully connected to Zoho CRM!")}`, baseUrl)
        );
        response.cookies.delete("zoho_oauth_state");

        return response;
    } catch (err) {
        console.error("Zoho OAuth callback error:", err);
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent("Failed to complete OAuth flow")}`, baseUrl)
        );
    }
}
