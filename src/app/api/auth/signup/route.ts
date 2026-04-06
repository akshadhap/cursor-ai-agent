import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  const AUTH_API = getAuthApi();
  try {
    const payload = await req.json();

    /* --------------------------------------------------
       🔐 AUTH SIGNUP
    -------------------------------------------------- */
    const authRes = await authRequest(AUTH_API, {
      url: `${normalizeBaseUrl(AUTH_API)}/auth/email/signup`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: payload,
    });

    const authData = authRes.data as {
      status?: string;
      message?: string;
      error?: string;
      reason?: string;
      userId?: string;
    };

    /* --------------------------------------------------
       ❌ AUTH ERROR HANDLING
    -------------------------------------------------- */
    if (!authRes || authData?.status === "error") {
      return Response.json(
        {
          error: authData?.message || authData?.error || "Signup failed",
          reason: authData?.reason || authRes?.status,
          status: authRes?.status,
        },
        { status: authRes?.status || 500 }
      );
    }

    /* --------------------------------------------------
       🆔 ENTITY HANDLING (CLIENT-SIDE CREATED)
    -------------------------------------------------- */
    const entityId = payload.entityId || authData.userId;
    const employeeId = payload.employeeId;

    /* --------------------------------------------------
       ✅ FINAL RESPONSE
    -------------------------------------------------- */
    return Response.json(
      {
        userId: authData.userId,
        entityId,
        employeeId,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Signup error", err.response?.data || err);

    return Response.json(
      { error: "Signup failed" },
      { status: err.response?.status || 500 }
    );
  }
}
