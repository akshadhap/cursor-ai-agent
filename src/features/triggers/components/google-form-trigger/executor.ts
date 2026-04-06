import type { NodeExecutor } from "@/features/executions/types";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";

type GoogleFormTriggerData = Record<string, unknown>;

export const googleFormTriggerExecutor: NodeExecutor<GoogleFormTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    googleFormTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // Merge templateConfig from node.data into the workflow context
  const mergedContext = {
    ...context,
    ...(data && (data as any).templateConfig
      ? {
          templateConfig: {
            ...(context as any).templateConfig,
            ...(data as any).templateConfig,
          },
        }
      : {}),
  };

  const result = await step.run("google-form-trigger", async () => mergedContext);

  await publish(
    googleFormTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};

