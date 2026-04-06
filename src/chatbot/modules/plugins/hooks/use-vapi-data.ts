"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";

// Types
type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;
type Assistants = typeof api.private.vapi.getAssistants._returnType;

type HookOptions = {
  enabled?: boolean;
  suppressErrorToast?: boolean;
};

/** Helper to get orgId from BetterAuth + Convex users */
function useEntityId() {
  const { data: session } = authClient.useSession();
  const users = useQuery(api.users.getMany);

  const email = session?.user?.email ?? null;
  const currentUser = users?.find((u) => u.email === email);
  const entityId = currentUser?.entityId ?? null;

  return entityId;
}

/* ---------------------------------------------------------
   HOOK: Assistants
--------------------------------------------------------- */
export const useVapiAssistants = (options?: HookOptions) => {
  const entityId = useEntityId();

  const getAssistants = useAction(api.private.vapi.getAssistants);

  const [data, setData] = useState<Assistants>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.enabled === false) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return;
    }
    if (!entityId) return; // wait until ready

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getAssistants({ entityId });
        setData(result);
        setError(null);
      } catch (error) {
        setError(error as Error);
        if (!options?.suppressErrorToast) {
          toast.error("Failed to fetch assistants");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [entityId, getAssistants, options?.enabled, options?.suppressErrorToast]);

  return { data, isLoading, error };
};

/* ---------------------------------------------------------
   HOOK: Phone Numbers
--------------------------------------------------------- */
export const useVapiPhoneNumbers = (options?: HookOptions) => {
  const entityId = useEntityId();

  const getPhoneNumbers = useAction(api.private.vapi.getPhoneNumbers);

  const [data, setData] = useState<PhoneNumbers>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.enabled === false) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return;
    }
    if (!entityId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getPhoneNumbers({ entityId });
        setData(result);
        setError(null);
      } catch (error) {
        setError(error as Error);
        if (!options?.suppressErrorToast) {
          toast.error("Failed to fetch phone numbers");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [entityId, getPhoneNumbers, options?.enabled, options?.suppressErrorToast]);

  return { data, isLoading, error };
};
