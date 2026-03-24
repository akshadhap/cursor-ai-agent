import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { getPublicBaseUrl } from "@/lib/publicBaseUrl";

export const runtime = "nodejs";

function sanitizeReturnTo(baseUrl: string, raw: string | null | undefined) {
  const fallback = "/integrations";
  const candidate = String(raw ?? "").trim();
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate, baseUrl);
    if (parsed.origin !== baseUrl) return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith("/")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

type HubSpotState = {
  entityId: string;
  returnTo?: string;
};

export async function GET(request: NextRequest) {
  const baseUrl = getPublicBaseUrl(request);

  const sessionAccessToken = request.cookies.get("access_token")?.value;
  const email = request.cookies.get("email")?.value;
  if (!sessionAccessToken || !email) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Not authenticated")}`, baseUrl),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const details = String(errorDescription ?? "").trim();
    const msg = details
      ? `HubSpot OAuth error: ${error} (${details})`
      : `HubSpot OAuth error: ${error}`;
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(msg)}`, baseUrl),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Missing authorization code or state")}`,
        baseUrl,
      ),
    );
  }

  const stateCookie = request.cookies.get("hubspot_oauth_state")?.value;
  if (!stateCookie || stateCookie !== state) {
    const response = NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Invalid state - possible CSRF attack")}`,
        baseUrl,
      ),
    );
    response.cookies.delete("hubspot_oauth_state");
    response.cookies.delete("hubspot_oauth_ctx");
    return response;
  }

  const ctxCookie = request.cookies.get("hubspot_oauth_ctx")?.value;
  if (!ctxCookie) {
    const response = NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(
          "Missing OAuth context. Please retry connecting HubSpot.",
        )}`,
        baseUrl,
      ),
    );
    response.cookies.delete("hubspot_oauth_state");
    response.cookies.delete("hubspot_oauth_ctx");
    return response;
  }

  let stateData: HubSpotState;
  try {
    stateData = JSON.parse(Buffer.from(ctxCookie, "base64url").toString("utf-8"));
  } catch {
    const response = NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent("Invalid state data")}`, baseUrl),
    );
    response.cookies.delete("hubspot_oauth_state");
    response.cookies.delete("hubspot_oauth_ctx");
    return response;
  }

  const redirectUri = `${baseUrl}/api/oauth/hubspot/callback`;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Missing NEXT_PUBLIC_CONVEX_URL")}`,
        baseUrl,
      ),
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  const users = await convex.query(api.users.getMany);
  const currentUser = Array.isArray(users) ? users.find((u: any) => u?.email === email) : null;
  const currentOrgId = typeof currentUser?.entityId === "string" ? currentUser.entityId : null;
  if (!currentOrgId) {
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Could not resolve entityId for current user")}`,
        baseUrl,
      ),
    );
  }

  if (stateData.entityId !== currentOrgId) {
    const response = NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Organization mismatch during OAuth flow")}`,
        baseUrl,
      ),
    );
    response.cookies.delete("hubspot_oauth_state");
    response.cookies.delete("hubspot_oauth_ctx");
    return response;
  }

  try {
    await convex.action((api as any).private.hubspot.completeOAuthConnection, {
      entityId: currentOrgId,
      code,
      redirectUri,
    });
  } catch (e) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as any).message)
        : "Failed to complete HubSpot OAuth";
    const response = NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, baseUrl),
    );
    response.cookies.delete("hubspot_oauth_state");
    response.cookies.delete("hubspot_oauth_ctx");
    return response;
  }

  const safeReturnTo = sanitizeReturnTo(baseUrl, stateData.returnTo);
  const response = NextResponse.redirect(new URL(`${safeReturnTo}?connected=true`, baseUrl));
  response.cookies.delete("hubspot_oauth_state");
  response.cookies.delete("hubspot_oauth_ctx");

  return response;
}
