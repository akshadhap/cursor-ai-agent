"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";


export const useSuspenseVoiceAgents = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.voiceagents.list.queryOptions()
  );
};

export const useRemoveVoiceAgent = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.voiceagents.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.voiceagents.list.queryKey(),  // ✔ FIX
        });
      },
    })
  );
};


/* ----------------------------------------------------
   CREATE PHONE
---------------------------------------------------- */
export const useCreatePhone = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.voiceagents.createPhone.mutationOptions({
      onSuccess: () => {
        // refresh list after phone creation
        queryClient.invalidateQueries({
          queryKey: trpc.voiceagents.list.queryKey(),
        });
      },
    })
  );
};

/* ----------------------------------------------------
   CREATE ASSISTANT
---------------------------------------------------- */
export const useCreateAssistant = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.voiceagents.createAssistant.mutationOptions({
      onSuccess: () => {
        // refresh list after assistant creation
        queryClient.invalidateQueries({
          queryKey: trpc.voiceagents.list.queryKey(),
        });
      },
    })
  );
};


export const useUploadKB = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.voiceagents.uploadKB.mutationOptions()
  );
};


export const useAttachPhone = () => {
  const trpc = useTRPC();

  return useMutation(trpc.voiceagents.attachPhone.mutationOptions());
};

