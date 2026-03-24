import { NextRequest } from "next/server";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

type ResetPasswordResponse = {
  status?: "success" | "error";
  message?: string;
};

export async function POST(req: NextRequest) {
  const AUTH_API = getAuthApi();
  try {
    const { email, verificationCode, newPassword } = await req.json();

    console.log("Reset password attempt:", {
      email,
      verificationCode: verificationCode ? "***" : undefined,
    });

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL
    -------------------------------------------------- */
    const res = await authRequest(AUTH_API, {
      url: `${AUTH_API}/auth/email/reset-password`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: { email, verificationCode, newPassword },
    });

    const data = res.data as ResetPasswordResponse;

    console.log("Keycloak reset response:", {
      status: res.status,
      data,
    });

    if (data?.status === "error") {
      return Response.json(
        { error: data.message || "Failed to reset password" },
        { status: 400 }
      );
    }

    return Response.json({
      message: data.message,
      status: data.status,
    });
  } catch (err: any) {
    console.error(
      "/api/auth/email/reset-password error",
      err.response?.data || err
    );

    return Response.json(
      {
        error:
          err.response?.data?.message ||
          "Failed to reset password",
      },
      { status: err.response?.status || 500 }
    );
  }
}
