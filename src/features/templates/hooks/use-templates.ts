import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useSaveToCommnunity = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.saveToCommnunity.mutationOptions({
      onSuccess: () => {
        toast.success("Template saved to community!");
        queryClient.invalidateQueries(
          trpc.templates.getAll.queryOptions(),
        );
      },
    })
  );
};

export const useTemplates = () => {
  const trpc = useTRPC();
  return useQuery(trpc.templates.getAll.queryOptions());
};

export const useUseTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.useTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.workflows.getMany.queryOptions({}),
        );
      },
    })
  );
};

export const useRemoveTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Template deleted");
        queryClient.invalidateQueries(
          trpc.templates.getAll.queryOptions(),
        );
      },
    })
  );
};
