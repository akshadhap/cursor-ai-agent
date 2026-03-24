import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();

        // Get user info from Keycloak cookies (same as /api/auth/session)
        const accessToken = cookieStore.get("access_token")?.value;
        const refreshToken = cookieStore.get("refresh_token")?.value;
        const email = cookieStore.get("email")?.value;

        // User must be logged in
        if (!email || !refreshToken) {
            return NextResponse.json(
                { error: "Unauthorized - Please login first" },
                { status: 401 }
            );
        }

        // User ID is the email (same as session API returns)
        const userId = email;

        console.log("Google Sheets OAuth authorize - user:", userId);

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: "Google OAuth not configured. Contact administrator." },
                { status: 500 }
            );
        }

        const redirectUri = `${appUrl}/api/oauth/google-sheets/callback`;

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/spreadsheets");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", userId); // Use email as userId

        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error("Google Sheets OAuth initiation error:", error);
        return NextResponse.json(
            { error: "Failed to initiate OAuth flow" },
            { status: 500 }
        );
    }
}
