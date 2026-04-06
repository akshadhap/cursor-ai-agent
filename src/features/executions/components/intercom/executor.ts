import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { intercomChannel } from "@/inngest/channels/intercom";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

const INTERCOM_BASE_URL = "https://api.intercom.io";
const INTERCOM_VERSION = "2.11";

type IntercomData = {
  variableName?: string;
  credentialId?: string;
  resource?: "contact" | "conversation" | "company";
  operation?: string;
  contactId?: string;
  conversationId?: string;
  companyId?: string;
  email?: string;
  name?: string;
  phone?: string;
  customAttributes?: string;
  messageBody?: string;
  messageType?: string;
  query?: string;
};

export const intercomExecutor: NodeExecutor<IntercomData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    intercomChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      intercomChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Intercom node: Credential is required");
  }

  const credential = await step.run("fetch-intercom-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      intercomChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Intercom node: Credential not found");
  }

  const accessToken = await decrypt(credential.value);

  if (!data.variableName) {
    await publish(
      intercomChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Intercom node: Variable name is missing");
  }

  const resource = data.resource || "contact";
  const operation = data.operation || "list";

  const template = (value?: string) => {
    if (!value) return "";
    try {
      return Handlebars.compile(value)(context);
    } catch {
      return value;
    }
  };

  const safeParseJson = <T>(value: string | undefined, defaultValue: T): T => {
    if (!value || !value.trim()) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (err) {
      const error = err as Error;
      const preview = value.length > 100 ? value.substring(0, 100) + "..." : value;
      throw new NonRetriableError(`Invalid JSON (${error.message}). Preview: ${preview}`);
    }
  };

  const buildRequest = async () => {
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Intercom-Version": INTERCOM_VERSION,
    };

    // CONTACT OPERATIONS
    if (resource === "contact") {
      if (operation === "list") {
        const res = await ky.get(`${INTERCOM_BASE_URL}/contacts`, { headers });
        return await res.json();
      }

      if (operation === "get") {
        const contactId = template(data.contactId);
        if (!contactId) {
          throw new NonRetriableError("Intercom: Contact ID is required");
        }
        const res = await ky.get(`${INTERCOM_BASE_URL}/contacts/${contactId}`, { headers });
        return await res.json();
      }

      if (operation === "create") {
        const email = template(data.email);
        const name = template(data.name);
        const phone = template(data.phone);
        const customAttributes = safeParseJson<Record<string, unknown>>(
          template(data.customAttributes),
          {}
        );

        const body: Record<string, unknown> = {
          role: "user",
        };
        if (email) body.email = email;
        if (name) body.name = name;
        if (phone) body.phone = phone;
        if (Object.keys(customAttributes).length > 0) {
          body.custom_attributes = customAttributes;
        }

        const res = await ky.post(`${INTERCOM_BASE_URL}/contacts`, {
          headers,
          json: body,
        });
        return await res.json();
      }

      if (operation === "update") {
        const contactId = template(data.contactId);
        if (!contactId) {
          throw new NonRetriableError("Intercom: Contact ID is required for update");
        }

        const email = template(data.email);
        const name = template(data.name);
        const phone = template(data.phone);
        const customAttributes = safeParseJson<Record<string, unknown>>(
          template(data.customAttributes),
          {}
        );

        const body: Record<string, unknown> = {};
        if (email) body.email = email;
        if (name) body.name = name;
        if (phone) body.phone = phone;
        if (Object.keys(customAttributes).length > 0) {
          body.custom_attributes = customAttributes;
        }

        const res = await ky.put(`${INTERCOM_BASE_URL}/contacts/${contactId}`, {
          headers,
          json: body,
        });
        return await res.json();
      }

      if (operation === "delete") {
        const contactId = template(data.contactId);
        if (!contactId) {
          throw new NonRetriableError("Intercom: Contact ID is required for delete");
        }
        const res = await ky.delete(`${INTERCOM_BASE_URL}/contacts/${contactId}`, { headers });
        return await res.json();
      }

      if (operation === "search") {
        const query = safeParseJson<Record<string, unknown>>(template(data.query), {});
        const res = await ky.post(`${INTERCOM_BASE_URL}/contacts/search`, {
          headers,
          json: { query },
        });
        return await res.json();
      }
    }

    // CONVERSATION OPERATIONS
    if (resource === "conversation") {
      if (operation === "list") {
        const res = await ky.get(`${INTERCOM_BASE_URL}/conversations`, { headers });
        return await res.json();
      }

      if (operation === "get") {
        const conversationId = template(data.conversationId);
        if (!conversationId) {
          throw new NonRetriableError("Intercom: Conversation ID is required");
        }
        const res = await ky.get(`${INTERCOM_BASE_URL}/conversations/${conversationId}`, { headers });
        return await res.json();
      }

      if (operation === "reply") {
        const conversationId = template(data.conversationId);
        if (!conversationId) {
          throw new NonRetriableError("Intercom: Conversation ID is required for reply");
        }
        const messageBody = template(data.messageBody);
        if (!messageBody) {
          throw new NonRetriableError("Intercom: Message body is required");
        }
        const messageType = data.messageType || "comment";

        const res = await ky.post(`${INTERCOM_BASE_URL}/conversations/${conversationId}/reply`, {
          headers,
          json: {
            message_type: messageType,
            type: "admin",
            body: messageBody,
          },
        });
        return await res.json();
      }
    }

    // COMPANY OPERATIONS
    if (resource === "company") {
      if (operation === "list") {
        const res = await ky.get(`${INTERCOM_BASE_URL}/companies`, { headers });
        return await res.json();
      }

      if (operation === "get") {
        const companyId = template(data.companyId);
        if (!companyId) {
          throw new NonRetriableError("Intercom: Company ID is required");
        }
        const res = await ky.get(`${INTERCOM_BASE_URL}/companies/${companyId}`, { headers });
        return await res.json();
      }

      if (operation === "create") {
        const companyId = template(data.companyId);
        const name = template(data.name);

        if (!companyId) {
          throw new NonRetriableError("Intercom: Company ID is required");
        }

        const body: Record<string, unknown> = {
          company_id: companyId,
        };
        if (name) body.name = name;

        const res = await ky.post(`${INTERCOM_BASE_URL}/companies`, {
          headers,
          json: body,
        });
        return await res.json();
      }
    }

    throw new NonRetriableError(
      `Intercom node: Unsupported resource/operation: ${resource}/${operation}`
    );
  };

  try {
    const result = await step.run(`intercom-${resource}-${operation}`, buildRequest);

    await publish(
      intercomChannel().status({
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
      intercomChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
