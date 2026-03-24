import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { smtp2goChannel } from "@/inngest/channels/smtp2go";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);

  return safeString;
});

type Smtp2goData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

export const smtp2goExecutor: NodeExecutor<Smtp2goData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const fromEmail = process.env.SMTP2GO_FROM_EMAIL;

  await publish(
    smtp2goChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!apiKey || !fromEmail) {
    await publish(
      smtp2goChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "SMTP2GO node: SMTP2GO_API_KEY or SMTP2GO_FROM_EMAIL is not set",
    );
  }

  if (!data.variableName) {
    await publish(
      smtp2goChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("SMTP2GO node: Variable name is missing");
  }

  if (!data.to || !data.subject || !data.body) {
    await publish(
      smtp2goChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "SMTP2GO node: to, subject and body are required",
    );
  }

  // Render templates using workflow context
  const compiledTo = Handlebars.compile(data.to)(context);
  const compiledSubject = Handlebars.compile(data.subject)(context);
  const compiledBody = Handlebars.compile(data.body)(context);

  try {
    const result = await step.run("smtp2go-email", async () => {
      const res = await ky.post("https://api.smtp2go.com/v3/email/send", {
        headers: {
          "Content-Type": "application/json",
        },
        json: {
          api_key: apiKey,
          sender: fromEmail,
          to: [compiledTo],
          subject: compiledSubject,
          text_body: compiledBody,
        },
      });

      return {
        smtp2go: {
          status: res.status,
          ok: res.ok,
        },
      };
    });

    await publish(
      smtp2goChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(
      smtp2goChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
