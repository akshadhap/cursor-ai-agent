import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: NextRequest) {
  const INVITES_API_ORIGIN = getAuthApi();
  try {
    const body = await req.json();

    const upstream = `${INVITES_API_ORIGIN}/auth/invites/create`;
    console.log("[Keycloak Invite] Sending request to:", upstream);
    console.log("[Keycloak Invite] Body:", JSON.stringify(body, null, 2));

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL TO AUTH SERVICE
    -------------------------------------------------- */
    const res = await authRequest(INVITES_API_ORIGIN, {
      url: upstream,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: body,
    });

    console.log("[Keycloak Invite] Response status:", res.status);
    console.log("[Keycloak Invite] Response body:", res.data);

    /* --------------------------------------------------
       ✅ RETURN UPSTREAM RESPONSE
    -------------------------------------------------- */
    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(
      "/api/auth/invites/create error",
      err.response?.data || err
    );

    return Response.json(
      {
        error: "Internal server error",
        details: err.response?.data || String(err),
      },
      { status: err.response?.status || 500 }
    );
  }
}
