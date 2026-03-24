import type { NodeExecutor } from "@/features/executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    manualTriggerChannel().status({
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

  const result = await step.run("manual-trigger", async () => mergedContext);

  await publish(
    manualTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
