import ky from "ky";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import type { McpClientToolFormValues } from "./dialog";
import { mcpClientToolChannel } from "@/inngest/channels/mcp_client_tool";

// Register JSON helper for Handlebars
Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

export const mcpClientToolExecutor: NodeExecutor<McpClientToolFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    mcpClientToolChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // Validate required fields
  if (!data.serverUrl) {
    await publish(
      mcpClientToolChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("MCP Tool: server URL is required");
  }

  if (!data.toolName) {
    await publish(
      mcpClientToolChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("MCP Tool: tool name is required");
  }

  if (!data.variableName) {
    await publish(
      mcpClientToolChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("MCP Tool: variable name is required");
  }

  // Parse and template the arguments
  let args: Record<string, unknown> = {};
  if (data.argsJson && data.argsJson.trim()) {
    try {
      const templated = Handlebars.compile(data.argsJson)(context);
      args = JSON.parse(decode(templated));
    } catch (err) {
      await publish(
        mcpClientToolChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError(
        `MCP Tool: invalid JSON arguments – ${(err as Error).message}`
      );
    }
  }

  // Template the tool name (in case it's dynamic)
  const toolName = decode(Handlebars.compile(data.toolName)(context));

  try {
    const result = await step.run("mcp-tool-exec", async () => {
      const baseUrl = data.serverUrl.endsWith("/")
        ? data.serverUrl.slice(0, -1)
        : data.serverUrl;

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (data.apiKey) {
        // Support both raw token and Bearer format
        const token = data.apiKey.startsWith("Bearer ")
          ? data.apiKey
          : `Bearer ${data.apiKey}`;
        headers["Authorization"] = token;
      }

      // Configure timeout (default 30s, max 300s)
      const timeoutValue = typeof data.timeout === 'string' ? parseInt(data.timeout, 10) : (data.timeout || 30);
      const timeout = Math.min(Math.max(timeoutValue * 1000, 1000), 300000);

      // Call the MCP tool endpoint
      // Standard MCP tool call format: POST /tools/call with { name, arguments }
      const res = await ky.post(`${baseUrl}/tools/call`, {
        json: {
          name: toolName,
          arguments: args,
        },
        headers,
        timeout,
      }).json<{ content?: unknown; result?: unknown; error?: string }>();

      // Handle MCP error response
      if (res.error) {
        throw new Error(`MCP Tool Error: ${res.error}`);
      }

      // Extract result (MCP responses typically have content or result field)
      const toolResult = res.content ?? res.result ?? res;

      return {
        ...context,
        [data.variableName!]: {
          tool: toolName,
          arguments: args,
          result: toolResult,
          timestamp: new Date().toISOString(),
        },
      };
    });

    await publish(
      mcpClientToolChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (err) {
    await publish(
      mcpClientToolChannel().status({
        nodeId,
        status: "error",
      }),
    );

    // Provide more context in error message
    const error = err as Error;
    if (error.message.includes("MCP Tool Error")) {
      throw new NonRetriableError(error.message);
    }
    throw new NonRetriableError(
      `MCP Tool '${toolName}' failed: ${error.message}`
    );
  }
};
