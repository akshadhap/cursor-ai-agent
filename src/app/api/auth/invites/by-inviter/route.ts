import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function GET(req: NextRequest) {
  const INVITES_API_ORIGIN = getAuthApi();
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return Response.json({ error: "uid is required" }, { status: 400 });
    }

    const upstream =
      `${INVITES_API_ORIGIN}/auth/invites/by-inviter?uid=${encodeURIComponent(uid)}`;

    const res = await authRequest(INVITES_API_ORIGIN, {
      url: upstream,
      method: "GET",
      headers: { Accept: "application/json" },
    });

    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(
      "/api/auth/invites/by-inviter error",
      err.response?.data || err
    );

    return Response.json(
      { error: "Internal server error" },
      { status: err.response?.status || 500 }
    );
  }
}

