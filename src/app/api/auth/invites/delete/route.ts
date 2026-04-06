import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function DELETE(req: NextRequest) {
  const INVITES_API_ORIGIN = getAuthApi();
  try {
    const { searchParams } = new URL(req.url);

    const inviteId = searchParams.get("inviteId");
    const employeeId = searchParams.get("employeeId");
    const entityId = searchParams.get("entityId");

    if (!inviteId) {
      return Response.json(
        { error: "inviteId is required" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       🔄 DELETE EMPLOYEE FROM ENTITY API (BEST EFFORT)
    -------------------------------------------------- */
    if (employeeId && entityId) {
      try {
        const empUpstream = `${
          process.env.ENTITY_API_ORIGIN ?? "http://127.0.0.1:8081"
        }/v1/entities/${encodeURIComponent(
          entityId
        )}/employees/${encodeURIComponent(employeeId)}`;

        await fetch(empUpstream, { method: "DELETE" });
      } catch (e) {
        console.warn("Failed to delete employee from entity API", e);
      }
    }

    /* --------------------------------------------------
       🔐 AUTHENTICATED DELETE INVITE
    -------------------------------------------------- */
    const upstream = `${INVITES_API_ORIGIN}/auth/invites/delete?inviteId=${encodeURIComponent(
      inviteId
    )}`;

    const res = await authRequest(INVITES_API_ORIGIN, {
      url: upstream,
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    /* --------------------------------------------------
       ✅ RETURN UPSTREAM RESPONSE
    -------------------------------------------------- */
    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(
      "/api/auth/invites/delete error",
      err.response?.data || err
    );

    return Response.json(
      { error: "Internal server error" },
      { status: err.response?.status || 500 }
    );
  }
}
