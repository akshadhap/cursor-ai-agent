"use client";

import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";

type Agents = unknown[];
type Avatars = unknown[];

type HookOptions = {
  enabled?: boolean;
  suppressErrorToast?: boolean;
};

export function useBeyondPresenceEntityId() {
  const { data: session } = authClient.useSession();
  const users = useQuery(api.users.getMany);

  const email = session?.user?.email ?? null;
  const currentUser = users?.find((u) => u.email === email);
  const entityId = currentUser?.entityId ?? null;

  return entityId;
}

export const useBeyondPresenceAgents = (options?: HookOptions) => {
  const entityId = useBeyondPresenceEntityId();

  const getAgents = useAction((api as any).private.beyondPresence.getAgents);

  const [data, setData] = useState<Agents>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (options?.enabled === false) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return;
    }
    if (!entityId) return;

    try {
      setIsLoading(true);
      const result = await getAgents({ entityId });
      setData(result);
      setError(null);
    } catch (error) {
      setError(error as Error);
      if (!options?.suppressErrorToast) {
        toast.error("Failed to fetch agents");
      }
    } finally {
      setIsLoading(false);
    }
  }, [entityId, getAgents, options?.enabled, options?.suppressErrorToast]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
};

export const useBeyondPresenceAvatars = () => {
  const entityId = useBeyondPresenceEntityId();

  const listAvatars = useAction(
    (api as any).private.beyondPresence.listAvatars,
  );

  const [data, setData] = useState<Avatars>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!entityId) return;

    try {
      setIsLoading(true);
      const result = await listAvatars({ entityId });
      setData(result);
      setError(null);
    } catch (error) {
      setError(error as Error);
      toast.error("Failed to fetch avatars");
    } finally {
      setIsLoading(false);
    }
  }, [entityId, listAvatars]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
};
