// src/lib/auth-utils.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getUserFromToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const email = cookieStore.get("email")?.value;

  console.log("getUserFromToken:", {
    hasToken: !!accessToken,
    hasEmail: !!email,
    email: email || 'none'
  });

  if (!accessToken || !email) {
    return null;
  }

  // Create a session-like object matching the expected format
  return {
    user: {
      id: email,
      email: email,
      name: email.split("@")[0],
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    token: accessToken,
  };
}

export const requireAuth = async () => {
  const session = await getUserFromToken();

  // Already authenticated → continue
  if (session) return session;

  // DEMO MODE: auto-login
  if (process.env.DEMO_MODE === "true") {
    redirect("/api/demo-login");
  }

  // Normal mode → redirect to login page
  redirect("/login");
};

export const requireUnauth = async () => {
  const session = await getUserFromToken();

  // If logged in → go home
  if (session) {
    redirect("/");
  }
};
