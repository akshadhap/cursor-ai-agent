"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export const useArtifacts = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.analytics.artifacts.queryOptions());
};
