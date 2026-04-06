import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: NextRequest) {
  const AUTH_API = getAuthApi();
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("Forgot password request for:", email);

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL
    -------------------------------------------------- */
    const res = await authRequest(AUTH_API, {
      url: `${AUTH_API}/auth/email/forgot-password`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: { email },
    });

    const data = res.data as {
      status?: string;
      message?: string;
    };

    console.log("Keycloak forgot password response:", {
      status: res.status,
      data,
    });

    if (data?.status === "error") {
      return Response.json(
        { error: data.message || "Failed to send reset code" },
        { status: 400 }
      );
    }

    return Response.json({
      message: data.message,
      status: data.status,
    });
  } catch (err: any) {
    // Endpoint not deployed / not available
    if (err.response?.status === 404) {
      return Response.json(
        {
          error:
            "Password reset is currently unavailable. Please contact support or wait for the feature to be deployed.",
          detail: "forgot-password endpoint not found on server",
        },
        { status: 503 }
      );
    }

    console.error(
      "/api/auth/email/forgot-password error",
      err.response?.data || err
    );

    return Response.json(
      {
        error:
          err.response?.data?.message ||
          "Failed to send reset code",
      },
      { status: err.response?.status || 500 }
    );
  }
}
