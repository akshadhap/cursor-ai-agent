import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: Request) {
  const AUTH_API = getAuthApi();
  try {
    const { userId } = await req.json();

    if (!userId) {
      return Response.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL
    -------------------------------------------------- */
    const res = await authRequest(AUTH_API, {
      url: `${AUTH_API}/auth/email/send-verify-email/${userId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return Response.json({ success: true }, { status: res.status });
  } catch (err: any) {
    console.error(
      "/api/auth/email/send-verify-email error",
      err.response?.data || err
    );

    return Response.json(
      {
        error:
          err.response?.data?.message ||
          "Failed to resend verification email",
      },
      { status: err.response?.status || 500 }
    );
  }
}
