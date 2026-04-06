import type { NodeExecutor } from "@/features/executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";

type WebhookTriggerData = {
  outputVariable?: string;
};

export const webhookTriggerExecutor: NodeExecutor<WebhookTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const variableName = data.outputVariable || "webhook";

  await publish(
    webhookTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // We assume the webhook payload was passed in as part of the initial context.
  // Typically, your route would do something like:
  // initialData: { webhook: { raw: body } }
  //
  // So here we:
  // - Prefer `context.webhook` if it exists
  // - Otherwise just use the entire context as the source
  const result = await step.run("webhook-trigger", async () => {
    const source =
      (context as any).webhook !== undefined ? (context as any).webhook : context;

    return {
      ...context,
      [variableName]: source,
    };
  });

  await publish(
    webhookTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
