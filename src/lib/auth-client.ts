"use client";

import { useState, useEffect } from "react";
import { getValidAccessToken, getUserEmail, clearTokens } from "./keycloak-client";

/* ---------------------------------------------------------
   Types matching Better Auth interface
--------------------------------------------------------- */

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: User;
  token: string;
}

interface UseSessionReturn {
  data: Session | null;
  isPending: boolean;
  error: Error | null;
}

/* ---------------------------------------------------------
   useSession hook - mimics Better Auth API
--------------------------------------------------------- */

// function useSession(): UseSessionReturn {
//   const [session, setSession] = useState<Session | null>(null);
//   const [isPending, setIsPending] = useState(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     async function checkSession() {
//       try {
//         // Call server-side API to check HttpOnly cookies
//         const response = await fetch("/api/auth/session", {
//           credentials: "include",
//         });

//         if (!response.ok) {
//           setSession(null);
//           setIsPending(false);
//           return;
//         }

//         const data = await response.json();

//         if (data.session) {
//           // Parse dates back from ISO strings
//           setSession({
//             ...data.session,
//             user: {
//               ...data.session.user,
//               createdAt: new Date(data.session.user.createdAt),
//               updatedAt: new Date(data.session.user.updatedAt),
//             },
//           });
//         } else {
//           setSession(null);
//           authClient.signOut();
//         }
//       } catch (err) {
//         setError(err instanceof Error ? err : new Error("Failed to check session"));
//         setSession(null);
//       } finally {
//         setIsPending(false);
//       }
//     }

//     checkSession();

//     // Check session every 30 seconds
//     const interval = setInterval(checkSession, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   return { data: session, isPending, error };
// }

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Session request failed");
        }

        const data = await res.json();

        // ✅ Valid session
        if (data.session) {
          if (!isMounted) return;

          setSession({
            ...data.session,
            user: {
              ...data.session.user,
              createdAt: new Date(data.session.user.createdAt),
              updatedAt: new Date(data.session.user.updatedAt),
            },
          });

          return;
        }

        // ❌ Refresh token failed → force logout
        forceLogout();
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Session check failed"));
        forceLogout();
      } finally {
        if (isMounted) setIsPending(false);
      }
    }

    function forceLogout() {
      if (!isMounted) return;

      setSession(null);
      clearTokens();

      // prevent redirect loops
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    checkSession();

    // ⏱ periodic revalidation (optional but good)
    const interval = setInterval(checkSession, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data: session, isPending, error };
}

/* ---------------------------------------------------------
   Sign in methods
--------------------------------------------------------- */

async function signInEmail(data: { email: string; password: string }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  const json = await response.json().catch(() => ({}));

  // Return payload and status; caller will decide how to handle required-actions vs real errors
  return { data: json, ok: response.ok, status: response.status };
}


async function signInSocial(options: { provider: string; callbackURL?: string }) {
  // For now, social sign-in would redirect to Keycloak
  // This is a placeholder - implement based on your Keycloak setup
  throw new Error("Social sign-in not yet implemented with Keycloak");
}

/* ---------------------------------------------------------
   Sign up methods
--------------------------------------------------------- */

async function signUpEmail(data: any) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => ({}));

  // ✅ THROW STRUCTURED ERROR (DO NOT use Error())
  if (!response.ok) {
    throw {
      status: response.status,   // ← 409 preserved
      data: json,                // ← backend message preserved
      message:
        json.error ||
        json.message ||
        "Signup failed",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: json,
    userId: json.userId,
  };
}


/* ---------------------------------------------------------
   Sign out method
--------------------------------------------------------- */

async function signOut(options?: { callbackURL?: string }) {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  clearTokens();

  if (options?.callbackURL) {
    window.location.href = options.callbackURL;
  } else {
    window.location.href = "/login";
  }
}

/* ---------------------------------------------------------
   Polar.sh subscription methods
--------------------------------------------------------- */

async function checkout(options: { slug: string }) {
  try {
    // Get the product ID based on slug
    const productId = options.slug === "pro" 
      ? "5607e0ef-7abe-4a63-a1ea-cdc4d5c85b5b" 
      : null;

    if (!productId) {
      console.error("Unknown product slug:", options.slug);
      return;
    }

    // Call backend to create checkout session
    const response = await fetch("/api/polar/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create checkout session:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      try {
        const errorJson = JSON.parse(errorText);
        console.error("Error details:", errorJson);
      } catch (e) {
        console.error("Error response (not JSON):", errorText);
      }
      return;
    }

    const { url } = await response.json();
    
    // Redirect to Polar checkout
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error("Checkout error:", error);
  }
}

async function customerPortal() {
  try {
    const response = await fetch("/api/polar/portal", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Failed to get portal URL");
      return;
    }

    const { url } = await response.json();
    
    // Redirect to Polar customer portal
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error("Customer portal error:", error);
  }
}

async function customerState() {
  try {
    const response = await fetch("/api/auth/customer-state", {
      credentials: "include",
    });

    if (!response.ok) {
      return { data: null };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to get customer state:", error);
    return { data: null };
  }
}

/* ---------------------------------------------------------
   Export authClient object matching Better Auth API
--------------------------------------------------------- */

export const authClient = {
  useSession,
  signIn: {
    email: signInEmail,
    social: signInSocial,
  },
  signUp: {
    email: signUpEmail,
  },
  signOut,
  checkout,
  customer: {
    portal: customerPortal,
    state: customerState,
  },
};