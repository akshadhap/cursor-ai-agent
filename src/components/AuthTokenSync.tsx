"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthTokenSync() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.token) {
      localStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0";
      return;
    }

    // store in BOTH (belt + suspenders)
    localStorage.setItem("access_token", session.token);
    document.cookie = `access_token=${session.token}; path=/; SameSite=Lax`;

  }, [session?.token]);

  return null;
}

export default AuthTokenSync;
