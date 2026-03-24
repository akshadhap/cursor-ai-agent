"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { setAuthToken } from "@/lib/auth-bridge";

export function SyncSessionToTokenStore() {
  const { data: session } = authClient.useSession();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.token) return;

    const [, payload] = session.token.split(".");
    const decoded = JSON.parse(atob(payload));
    console.log("TOKEN EXP:", new Date(decoded.exp * 1000));
  }, [session?.token]);



  useEffect(() => {
    if (session === undefined) return; // still loading

    const token = session?.token ?? null;

    if (lastTokenRef.current !== token) {
      setAuthToken(token);
      lastTokenRef.current = token;
    }
  }, [session]);

  return null;
}
