import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: Request) {
  const AUTH_API = getAuthApi();
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return Response.json(
        { error: "userId and code are required" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL
    -------------------------------------------------- */
    const res = await authRequest(AUTH_API, {
      url: `${AUTH_API}/auth/email/verify-code/${userId}/${code}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return Response.json(
      { success: true },
      { status: res.status }
    );
  } catch (err: any) {
    console.error(
      "/api/auth/email/verify-code error",
      err.response?.data || err
    );

    return Response.json(
      {
        error:
          err.response?.data?.message ||
          "Invalid verification code",
      },
      { status: err.response?.status || 400 }
    );
  }
}
