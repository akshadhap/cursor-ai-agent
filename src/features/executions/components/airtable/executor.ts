import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { airtableChannel } from "@/inngest/channels/airtable";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

const AIRTABLE_BASE_URL = "https://api.airtable.com/v0";

type AirtableData = {
  variableName?: string;
  credentialId?: string;
  resource?: "base" | "record";
  operation?: string;
  baseId?: string;
  tableIdOrName?: string;
  recordId?: string;
  fields?: string;
  filterByFormula?: string;
  maxRecords?: string;
  view?: string;
};

export const airtableExecutor: NodeExecutor<AirtableData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    airtableChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      airtableChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airtable node: Credential is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-airtable-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      airtableChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airtable node: Credential not found");
  }

  const apiToken = await decrypt(credential.value);

  if (!data.variableName) {
    await publish(
      airtableChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airtable node: Variable name is missing");
  }

  const resource = data.resource || "record";
  const operation = data.operation || "list";

  // Template helper
  const template = (value?: string) => {
    if (!value) return "";
    try {
      return Handlebars.compile(value)(context);
    } catch {
      return value;
    }
  };

  // Safe JSON parse
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

  // Build API request based on resource and operation
  const buildRequest = async () => {
    const headers = {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };

    // BASE OPERATIONS
    if (resource === "base") {
      if (operation === "list") {
        const res = await ky.get(`${AIRTABLE_BASE_URL}/meta/bases`, { headers });
        return await res.json();
      }
      if (operation === "getSchema") {
        const baseId = template(data.baseId);
        if (!baseId) {
          throw new NonRetriableError("Airtable: Base ID is required");
        }
        const res = await ky.get(`${AIRTABLE_BASE_URL}/meta/bases/${baseId}/tables`, { headers });
        return await res.json();
      }
    }

    // RECORD OPERATIONS
    if (resource === "record") {
      const baseId = template(data.baseId);
      const tableIdOrName = template(data.tableIdOrName);

      if (!baseId) {
        throw new NonRetriableError("Airtable: Base ID is required for record operations");
      }
      if (!tableIdOrName) {
        throw new NonRetriableError("Airtable: Table ID or Name is required for record operations");
      }

      const tableUrl = `${AIRTABLE_BASE_URL}/${baseId}/${encodeURIComponent(tableIdOrName)}`;

      // LIST RECORDS
      if (operation === "list") {
        const params = new URLSearchParams();

        const filterByFormula = template(data.filterByFormula);
        if (filterByFormula) {
          params.append("filterByFormula", filterByFormula);
        }

        const maxRecords = template(data.maxRecords);
        if (maxRecords) {
          params.append("maxRecords", maxRecords);
        }

        const view = template(data.view);
        if (view) {
          params.append("view", view);
        }

        const queryString = params.toString();
        const url = queryString ? `${tableUrl}?${queryString}` : tableUrl;

        const res = await ky.get(url, { headers });
        return await res.json();
      }

      // GET RECORD
      if (operation === "get") {
        const recordId = template(data.recordId);
        if (!recordId) {
          throw new NonRetriableError("Airtable: Record ID is required");
        }
        const res = await ky.get(`${tableUrl}/${recordId}`, { headers });
        return await res.json();
      }

      // CREATE RECORD
      if (operation === "create") {
        const fieldsJson = template(data.fields);
        const fields = safeParseJson<Record<string, unknown>>(fieldsJson, {});

        if (Object.keys(fields).length === 0) {
          throw new NonRetriableError("Airtable: Fields are required for create operation");
        }

        const res = await ky.post(tableUrl, {
          headers,
          json: {
            fields,
          },
        });
        return await res.json();
      }

      // UPDATE RECORD
      if (operation === "update") {
        const recordId = template(data.recordId);
        if (!recordId) {
          throw new NonRetriableError("Airtable: Record ID is required for update");
        }

        const fieldsJson = template(data.fields);
        const fields = safeParseJson<Record<string, unknown>>(fieldsJson, {});

        const res = await ky.patch(`${tableUrl}/${recordId}`, {
          headers,
          json: {
            fields,
          },
        });
        return await res.json();
      }

      // DELETE RECORD
      if (operation === "delete") {
        const recordId = template(data.recordId);
        if (!recordId) {
          throw new NonRetriableError("Airtable: Record ID is required for delete");
        }

        const res = await ky.delete(`${tableUrl}/${recordId}`, { headers });
        return await res.json();
      }
    }

    throw new NonRetriableError(
      `Airtable node: Unsupported resource/operation: ${resource}/${operation}`
    );
  };

  try {
    const result = await step.run(`airtable-${resource}-${operation}`, buildRequest);

    await publish(
      airtableChannel().status({
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
      airtableChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
