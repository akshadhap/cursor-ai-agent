"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useOutboundNumbers = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.batchcalls.outboundNumbers.queryOptions());
};



export const useScheduleBatch = () => {
  const trpc = useTRPC();
  
  return useMutation(
    trpc.batchcalls.schedule.mutationOptions()
  );
};
