import { syncUserToConvex } from "@/lib/sync-convex-user";
import { syncUserToPrisma } from "@/lib/sync-prisma-user";
import { syncUserToPolar } from "@/lib/sync-polar-user";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";


type AuthLoginResponse = {
  actions?: string[];
  action?: string;
  requiredActions?: string[];
  required_actions?: string[];
  userId?: string;
  user_id?: string;
  reason?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  name?: string;
  message?: string;
  error?: string;
};

export async function POST(req: Request) {
  const AUTH_API = getAuthApi();
  const { email, password } = await req.json();

  let res: any;
  let data: AuthLoginResponse;

  /* --------------------------------------------------
     🔐 LOGIN
  -------------------------------------------------- */
  try {
    res = await authRequest(AUTH_API, {
      url: `${AUTH_API}/auth/email/login`,
      method: "POST",
      data: {
        username: email,
        password,
      },
    });

    data = res.data as AuthLoginResponse;
  } catch (err: any) {
    if (err.response?.data) {
      res = err.response;
      data = err.response.data as AuthLoginResponse;
    } else {
      console.error("Login failed:", err);
      return Response.json({ error: "Login failed" }, { status: 500 });
    }
  }

  /* --------------------------------------------------
     ✅ REQUIRED ACTIONS
  -------------------------------------------------- */
  let actions: string[] = [];

  if (Array.isArray(data.actions)) actions = data.actions;
  else if (data.action) actions = [data.action];
  else if (Array.isArray(data.requiredActions)) actions = data.requiredActions;
  else if (Array.isArray(data.required_actions)) actions = data.required_actions;

  if (actions.length > 0) {
    if (actions.includes("VERIFY_EMAIL") && data.userId) {
      await authRequest(AUTH_API, {
        url: `${AUTH_API}/auth/email/send-verify-email/${data.userId}`,
        method: "POST",
      }).catch(() => { });
    }

    return Response.json({
      actions,
      userId: data.userId,
      email,
      message: "User must complete required actions",
    });
  }

  /* --------------------------------------------------
     ❌ LOGIN FAILURE
  -------------------------------------------------- */
  if (!res || res.status >= 400) {
    return Response.json(
      { error: data.message || "Login failed" },
      { status: res?.status || 400 }
    );
  }

  /* --------------------------------------------------
     🔄 SYNC USER (NON-BLOCKING)
  -------------------------------------------------- */
  syncUserToConvex(email).catch(console.error);
  syncUserToPrisma(email).catch(console.error);
  syncUserToPolar(email, data.name).catch(console.error);

  /* --------------------------------------------------
     🍪 SET COOKIES
  -------------------------------------------------- */
  const isSecure = process.env.NODE_ENV === "production";
  const response = Response.json({ ok: true });

  response.headers.append(
    "Set-Cookie",
    `access_token=${data.access_token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${data.expires_in}${isSecure ? "; Secure" : ""
    }`
  );

  response.headers.append(
    "Set-Cookie",
    `refresh_token=${data.refresh_token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60
    }${isSecure ? "; Secure" : ""}`
  );

  response.headers.append(
    "Set-Cookie",
    `email=${encodeURIComponent(email)}; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60
    }${isSecure ? "; Secure" : ""}`
  );

  return response;
}
