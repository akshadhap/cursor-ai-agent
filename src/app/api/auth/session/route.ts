import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

/* -------------------------------------------------- */
/* HELPERS */
/* -------------------------------------------------- */

function decodeExp(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString()
    );
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpired(token: string, bufferMs = 30_000) {
  const exp = decodeExp(token);
  if (!exp) return true;
  return Date.now() >= exp - bufferMs;
}

function clearAuthCookies() {
  const response = Response.json({ session: null }, { status: 200 });

  response.headers.append(
    "Set-Cookie",
    "access_token=; Path=/; HttpOnly; Max-Age=0"
  );
  response.headers.append(
    "Set-Cookie",
    "refresh_token=; Path=/; HttpOnly; Max-Age=0"
  );
  response.headers.append(
    "Set-Cookie",
    "email=; Path=/; Max-Age=0"
  );

  return response;
}

/* -------------------------------------------------- */
/* SESSION HANDLER */
/* -------------------------------------------------- */

export async function GET(req: NextRequest) {
  const AUTH_API_BASE = getAuthApi();
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const email = cookieStore.get("email")?.value;

  if (!email || !refreshToken) {
    return clearAuthCookies();
  }

  let validAccessToken = accessToken;

  /* --------------------------------------------------
     🔄 REFRESH TOKEN IF ACCESS TOKEN EXPIRED
  -------------------------------------------------- */
  if (!accessToken || isExpired(accessToken)) {
    try {
      const res = await authRequest(AUTH_API_BASE, {
        url: `${AUTH_API_BASE}/auth/tokens/refresh`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: { refreshToken },
      });

      const data = res.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      validAccessToken = data.access_token;

      cookieStore.set("access_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: data.expires_in,
      });

      if (data.refresh_token) {
        cookieStore.set("refresh_token", data.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
      }
    } catch (err) {
      console.error("Token refresh failed", err);
      return clearAuthCookies();
    }
  }

  /* --------------------------------------------------
     ✅ RETURN SESSION
  -------------------------------------------------- */
  return Response.json({
    session: {
      user: {
        id: email,
        email,
        name: email.split("@")[0],
        image: null,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: validAccessToken,
    },
  });
}
