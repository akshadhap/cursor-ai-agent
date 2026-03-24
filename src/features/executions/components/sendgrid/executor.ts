import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { sendgridChannel } from "@/inngest/channels/sendgrid";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);

  return safeString;
});

type SendgridData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

export const sendgridExecutor: NodeExecutor<SendgridData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const templateId = "d-34a400b144134e83bcd48ea2791a52f2"; // 👈 your template ID

  await publish(
    sendgridChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!apiKey || !fromEmail) {
    await publish(
      sendgridChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "SendGrid node: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL is not set",
    );
  }

  if (!data.variableName) {
    await publish(
      sendgridChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("SendGrid node: Variable name is missing");
  }

  if (!data.to || !data.subject || !data.body) {
    await publish(
      sendgridChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      "SendGrid node: to, subject and body are required",
    );
  }

  // Render templates with Handlebars using the current workflow context
  const compiledTo = Handlebars.compile(data.to)(context);
  const compiledSubject = Handlebars.compile(data.subject)(context);
  const compiledBody = Handlebars.compile(data.body)(context);

  try {
    const result = await step.run("sendgrid-email", async () => {
      const res = await ky.post("https://api.sendgrid.com/v3/mail/send", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        json: {
          from: { email: fromEmail },
          template_id: templateId,
          personalizations: [
            {
              to: [{ email: compiledTo }],
              dynamic_template_data: {
                subject: compiledSubject,
                body: compiledBody, // used in your SendGrid template as {{body}}
              },
            },
          ],
          // no "content" – template handles HTML/text
        },
      });

      return {
        sendgrid: {
          status: res.status,
          ok: res.ok,
        },
      };
    });

    await publish(
      sendgridChannel().status({
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
      sendgridChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
