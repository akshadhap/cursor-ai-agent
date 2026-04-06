// src/app/features/executions/components/wait/executor.ts
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { waitChannel } from "@/inngest/channels/wait";

type WaitData = {
  delayDays?: number;
  delayHours?: number;
  delayMinutes?: number;
};

export const waitExecutor: NodeExecutor<WaitData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    waitChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data) {
    await publish(
      waitChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Wait node: data is missing");
  }

  const days = data.delayDays ?? 0;
  const hours = data.delayHours ?? 0;
  const minutes = data.delayMinutes ?? 0;

  if (days < 0 || hours < 0 || minutes < 0) {
    await publish(
      waitChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Wait node: delay must be non-negative");
  }

  const ms =
    ((days * 24 + hours) * 60 + minutes) * 60 * 1000;

  if (ms > 0) {
    await step.sleep("wait-delay", ms);
  }

  await publish(
    waitChannel().status({
      nodeId,
      status: "success",
    }),
  );

  // pass-through
  return context;
};
