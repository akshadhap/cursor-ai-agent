const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_BASE ||
  "https://dev-auth-keyclock-api-202915607304.us-central1.run.app";

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
}

/* ---------------------------------------------------------
   Helpers: cookies (browser-side, NOT HttpOnly)
--------------------------------------------------------- */

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof window === "undefined") return;

  let cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Secure`;
  if (maxAgeSeconds) {
    cookie += `; Max-Age=${maxAgeSeconds}`;
  }
  document.cookie = cookie;
}

function deleteCookie(name: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^|; )" + name.replace(/([$^*+?.()|[\]\\])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

/* ---------------------------------------------------------
   SHA256 signature helper (for Spinabot APIs)
--------------------------------------------------------- */

const sha256Hex = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const computeSpinabotSignature = async (token: string): Promise<string> => {
  const today = new Date().toISOString().slice(0, 10);
  const raw = `Bearer ${token}:${today}`;
  return sha256Hex(raw);
};

/* ---------------------------------------------------------
   Token storage (in cookies)
--------------------------------------------------------- */

export const storeTokens = (
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) => {
  const expirationTime = Date.now() + expiresIn * 1000;

  // access / refresh tokens
  setCookie("access_token", accessToken, expiresIn);
  setCookie("refresh_token", refreshToken, 30 * 24 * 60 * 60); 
  setCookie("token_expiration", String(expirationTime), expiresIn);
};

export const clearTokens = () => {
  deleteCookie("access_token");
  deleteCookie("refresh_token");
  deleteCookie("token_expiration");
  deleteCookie("email");
};

/* ---------------------------------------------------------
   Refresh token — used by axios interceptor
--------------------------------------------------------- */

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getCookie("refresh_token");
  if (!refreshToken) {
    clearTokens();
    throw new Error("No refresh token available");
  }

  const res = await fetch(`${AUTH_API_BASE}/auth/tokens/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = (await res.json()) as RefreshResponse | { message?: string };

  if (!res.ok) {
    clearTokens();
    throw new Error((data as any)?.message || "Token refresh failed");
  }

  const refreshData = data as RefreshResponse;

  storeTokens(refreshData.access_token, refreshData.refresh_token, refreshData.expires_in);

  return refreshData.access_token;
}

/* ---------------------------------------------------------
   Get valid access token — used by axios interceptor, signup
--------------------------------------------------------- */

export async function getValidAccessToken(): Promise<string | null> {
  const token = getCookie("access_token");
  const expiration = getCookie("token_expiration");

  if (!token || !expiration) {
    return null;
  }

  const expMs = parseInt(expiration, 10);
  const now = Date.now();

  // if not close to expiry (30s buffer), use current token
  if (now < expMs - 30_000) {
    return token;
  }

  try {
    // try to refresh
    return await refreshAccessToken();
  } catch (err) {
    console.error("Failed to refresh token:", err);
    return null;
  }
}

/* ---------------------------------------------------------
   Get user email from cookie
--------------------------------------------------------- */

export function getUserEmail(): string | null {
  return getCookie("email");
}
