import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { getPublicBaseUrl } from "@/lib/publicBaseUrl";

export const runtime = "nodejs";

function sanitizeReturnTo(baseUrl: string, raw: string | null) {
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

export async function GET(request: NextRequest) {
  const baseUrl = getPublicBaseUrl(request);

  const accessToken = request.cookies.get("access_token")?.value;
  const email = request.cookies.get("email")?.value;
  if (!accessToken || !email) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Not authenticated")}`, baseUrl),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const returnTo = sanitizeReturnTo(baseUrl, searchParams.get("returnTo"));

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
  const currentUser = Array.isArray(users)
    ? users.find((u: any) => u?.email === email)
    : null;
  const entityId =
    typeof currentUser?.entityId === "string" ? currentUser.entityId : null;
  if (!entityId) {
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(
          "Could not resolve entityId for current user",
        )}`,
        baseUrl,
      ),
    );
  }

  let clientId: string;
  try {
    const cfg = await convex.action((api as any).private.slack.getOAuthAppConfig, {
      entityId,
    });
    clientId = String(cfg?.clientId ?? "");
  } catch (e) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as any).message)
        : "Missing Slack OAuth app config";
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, baseUrl),
    );
  }

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent("Missing Slack OAuth app config")}`,
        baseUrl,
      ),
    );
  }

  const redirectUri = `${baseUrl}/api/oauth/slack/callback`;

  const state = randomBytes(32).toString("base64url");
  const ctx = Buffer.from(JSON.stringify({ entityId, returnTo })).toString(
    "base64url",
  );

  // Scopes: keep minimal; you can expand later.
  // - chat:write -> post messages
  // - channels:read -> list public channels (optional for UI)
  // - groups:read, im:read, mpim:read -> list other conversation types (optional)
  // - chat:write.public -> post to public channels without joining (optional)
  const scope = "chat:write,channels:read,groups:read,im:read,mpim:read";

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  const isHttps = baseUrl.startsWith("https://");
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set("slack_oauth_ctx", ctx, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
