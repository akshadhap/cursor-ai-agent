import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { mcpClientChannel } from "@/inngest/channels/mcp_client";
import type { McpClientFormValues } from "./dialog";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

export const mcpClientExecutor: NodeExecutor<McpClientFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    mcpClientChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.endpoint) {
    await publish(
      mcpClientChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("MCP client: endpoint is required");
  }

  if (!data.serverUrl) {
    await publish(
      mcpClientChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("MCP client: server URL is required");
  }

  if (!data.variableName) {
    await publish(
      mcpClientChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("MCP client: variable name is required");
  }

  const rawEndpoint = Handlebars.compile(data.endpoint)(context);
  const endpoint = decode(rawEndpoint);

  const rawPayload =
    data.payload && data.payload.trim().length
      ? Handlebars.compile(data.payload)(context)
      : undefined;

  let jsonPayload: unknown | undefined;
  if (rawPayload) {
    try {
      jsonPayload = JSON.parse(decode(rawPayload));
    } catch (err) {
      await publish(
        mcpClientChannel().status({
          nodeId,
          status: "error",
        })
      );
      throw new NonRetriableError(
        `MCP client: invalid JSON payload – ${(err as Error).message}`
      );
    }
  }

  try {
    const result = await step.run("mcp-api-call", async () => {
      // Construct full URL - ensure baseUrl doesn't end with / and endpoint starts with /
      const baseUrl = data.serverUrl.replace(/\/$/, ''); // Remove trailing slash
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const fullUrl = `${baseUrl}${cleanEndpoint}`;

      console.log('MCP Client - Making request to:', fullUrl);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (data.apiKey) {
        headers["Authorization"] = `Bearer ${data.apiKey}`;
      }

      const fetchOptions: RequestInit = {
        method: data.method || "POST",
        headers,
      };

      if (jsonPayload && fetchOptions.method !== "GET") {
        fetchOptions.body = JSON.stringify(jsonPayload);
      }

      console.log('MCP Client - Request options:', { method: fetchOptions.method, hasBody: !!fetchOptions.body });

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();

      return {
        ...context,
        [data.variableName!]: {
          response: res,
        },
      };
    });

    await publish(
      mcpClientChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (err) {
    console.error('MCP Client - Error:', err);
    await publish(
      mcpClientChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw err;
  }
};
