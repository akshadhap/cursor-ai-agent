"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient,useQuery } from "@tanstack/react-query";



export const useCallLogs = () => {
  const trpc = useTRPC();

  return useSuspenseQuery({
    ...trpc.calllogs.list.queryOptions(),
    select(data) {
      // server returns [] OR {}
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as any).calls)) return (data as any).calls;

      return []; // fallback
    },
  });
};



export const useOutboundNumbers = () => {
  const trpc = useTRPC();

  return useSuspenseQuery(
    trpc.calllogs.outboundNumbers.queryOptions(undefined, {
      select(data) {
        const assistantMap: Record<string, string> = {};

        data.assistants.assistants.forEach((a: any) => {
          assistantMap[a.id] = a.name;
        });

        return data.phones.phones
          .filter((p: any) => p.assistant_id !== null)
          .map((p: any) => ({
            id: p.id,
            number: p.number,
            assistant_id: p.assistant_id,
            assistant_name: assistantMap[p.assistant_id] ?? "Unknown Assistant",
          }));
      },
    })
  );
};


export const useMakeCall = () => {
  const trpc = useTRPC();
  const qc = useQueryClient();

  return useMutation(
    trpc.calllogs.makeCall.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: trpc.calllogs.list.queryKey(),
        });
      },
    })
  );
};


// export const useTranscript = (callId: string) => {
//   const trpc = useTRPC();
//   return useSuspenseQuery(
//     trpc.calllogs.transcript.queryOptions({ callId })
//   );
// };

export const useTranscript = (callId: string | null) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.calllogs.transcript.queryOptions({ callId: callId ?? "" }),
    enabled: !!callId, // only fetch if a callId exists
  });
};


export const useRecording = () => {
  const trpc = useTRPC();
  return useMutation(trpc.calllogs.recording.mutationOptions());
};
