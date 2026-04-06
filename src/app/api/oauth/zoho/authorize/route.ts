import { NextRequest, NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/publicBaseUrl";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const region = searchParams.get("region") || "com";
    const clientId = searchParams.get("clientId");
    const clientSecret = searchParams.get("clientSecret");

    if (!name || !clientId || !clientSecret) {
        return NextResponse.redirect(
            new URL(`/credentials/new?error=${encodeURIComponent("Missing required parameters")}`, request.url)
        );
    }

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

    // Build the callback URL (must be registered in Zoho API Console)
    const baseUrl = getPublicBaseUrl(request);
    const redirectUri = `${baseUrl}/api/oauth/zoho/callback`;

    // Store state in a cookie for verification on callback
    const state = Buffer.from(
        JSON.stringify({ name, region, clientId, clientSecret })
    ).toString("base64");

    // Zoho OAuth2 authorization URL
    const authUrl = new URL(`https://${accountsDomain}/oauth/v2/auth`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    // Set state cookie for verification (secure + sameSite=none for cross-origin OAuth)
    const isHttps = baseUrl.startsWith("https://");
    response.cookies.set("zoho_oauth_state", state, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax",
        maxAge: 600, // 10 minutes
        path: "/",
    });

    return response;
}
