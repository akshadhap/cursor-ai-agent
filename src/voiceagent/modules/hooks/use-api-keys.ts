"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery,useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";


export const useApiKeys = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.apikeys.list.queryOptions());
};




export const useCreateApiKey = () => {
  const trpc = useTRPC();
  const qc = useQueryClient();

  return useMutation(
    trpc.apikeys.create.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: trpc.apikeys.list.queryKey(),
        });
      },
    })
  );
};

export const useRevokeApiKey = () => {
  const trpc = useTRPC();
  const qc = useQueryClient();

  return useMutation(
    trpc.apikeys.revoke.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: trpc.apikeys.list.queryKey(),
        });
      },
    })
  );
};
