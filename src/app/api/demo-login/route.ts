// src/app/api/demo-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { syncUserToConvex } from "@/lib/sync-convex-user";
import { syncUserToPrisma } from "@/lib/sync-prisma-user";
import { syncUserToPolar } from "@/lib/sync-polar-user";

const AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_API_BASE ||
  "https://dev-auth-keyclock-api-202915607304.us-central1.run.app";

export async function GET(req: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const email = process.env.DEMO_EMAIL!;
  const password = process.env.DEMO_PASSWORD!;
  const callback = process.env.DEMO_REDIRECT || "/workflows";

  // Check if already logged in (prevent infinite loops)
  const existingToken = req.cookies.get("access_token")?.value;
  const existingEmail = req.cookies.get("email")?.value;
  
  if (existingToken && existingEmail) {
    console.log("Demo user already has access token AND email, redirecting to callback");
    return NextResponse.redirect(new URL(callback, req.url));
  }

  console.log("Demo login: Attempting to login with demo credentials...");

  try {
    // Try to login first
    let res = await fetch(`${AUTH_API}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data = await res.json();

    console.log("Demo login response:", { status: res.status, hasToken: !!data.access_token });

    // Handle email verification required
    if (!res.ok && data.reason === "required_actions" && data.requiredActions?.includes("VERIFY_EMAIL")) {
      console.log("Demo user needs email verification, sending verification email...");
      
      const userId = data.userId;
      
      // Send verification email
      const verifyEmailRes = await fetch(
        `${AUTH_API}/auth/email/send-verify-email/${userId}`,
        { method: "POST" }
      );

      if (!verifyEmailRes.ok) {
        console.error("Failed to send verification email");
      } else {
        console.log("✅ Verification email sent to", email);
      }

      // Redirect to verify page with auto-login params
      const verifyUrl = new URL("/verify", req.url);
      verifyUrl.searchParams.set("userId", userId);
      verifyUrl.searchParams.set("email", email);
      verifyUrl.searchParams.set("password", password);
      verifyUrl.searchParams.set("autoLogin", "true");
      verifyUrl.searchParams.set("redirect", callback);
      
      return NextResponse.redirect(verifyUrl);
    }

    // If login fails with invalid credentials, user exists but password is wrong
    if (!res.ok && data.message === "invalid credentials") {
      console.error("❌ Demo user exists but password is WRONG in .env file!");
      console.error("Please either:");
      console.error("1. Delete the user from Keycloak admin console");
      console.error("2. Update DEMO_PASSWORD in .env to match the existing user's password");
      console.error("3. Use forgot password flow to reset the password");
      
      // Return JSON error instead of redirect to break the loop
      return NextResponse.json(
        { 
          error: "Demo password mismatch",
          message: "The demo user exists but the password in .env doesn't match. Please check the server logs for solutions."
        },
        { status: 401 }
      );
    }

    // If login failed for other reasons
    if (!res.ok) {
      console.error("Demo login failed:", data);
      return NextResponse.json(
        { error: "Demo login failed", details: data },
        { status: 400 }
      );
    }

    console.log("✅ Demo login successful! Setting cookies and redirecting...");

    // Sync user to Convex, Prisma, and Polar (non-blocking)
    syncUserToConvex(email).catch((err) => console.error("[Demo Login] Convex sync failed:", err));
    syncUserToPrisma(email).catch((err) => console.error("[Demo Login] Prisma sync failed:", err));
    syncUserToPolar(email, data.name).catch((err) => console.error("[Demo Login] Polar sync failed:", err));

    // Create redirect response
    const redirectUrl = new URL(callback, req.url);
    const nextRes = NextResponse.redirect(redirectUrl);

    // Set auth cookies
    const isProd = process.env.NODE_ENV === "production";
    
    console.log("Setting cookies:", { 
      isProd, 
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      email 
    });
    
    nextRes.cookies.set("access_token", data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in,
    });

    if (data.refresh_token) {
      nextRes.cookies.set("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    nextRes.cookies.set("email", email, {
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log("Cookies set, redirecting to:", callback);

    return nextRes;
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
