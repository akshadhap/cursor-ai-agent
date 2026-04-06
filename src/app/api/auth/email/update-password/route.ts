
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: Request) {
  const AUTH_API = getAuthApi();
  try {
    const body = await req.json().catch(() => ({}));

    let res: any;
    let data: any;

    /* --------------------------------------------------
       🔐 AUTHENTICATED CALL
       IMPORTANT: Axios throws on 4xx — handle both paths
    -------------------------------------------------- */
    try {
      res = await authRequest(AUTH_API, {
        url: `${AUTH_API}/auth/email/update-password`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: body,
      });

      data = res.data;
    } catch (err: any) {
      if (err.response) {
        res = err.response;
        data = err.response.data;
      } else {
        throw err;
      }
    }

    /* --------------------------------------------------
       ❌ UPSTREAM ERROR — PASSTHROUGH
    -------------------------------------------------- */
    if (res.status >= 400) {
      if (typeof data === "object") {
        return Response.json(data, { status: res.status });
      }
      return new Response(String(data), { status: res.status });
    }

    /* --------------------------------------------------
       ✅ SUCCESS — PASSTHROUGH
    -------------------------------------------------- */
    if (typeof data === "object") {
      return Response.json(data);
    }

    return new Response(String(data));
  } catch (err: any) {
    console.error("update-password proxy error", err);

    return Response.json(
      { error: err?.message || "Failed to update password" },
      { status: 500 }
    );
  }
}
