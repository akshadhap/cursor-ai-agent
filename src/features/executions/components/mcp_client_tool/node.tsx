"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";

import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchMcpClientToolRealtimeToken } from "./actions";
import { MCP_CLIENT_TOOL_CHANNEL_NAME } from "@/inngest/channels/mcp_client_tool";
import { McpClientToolDialog, McpClientToolFormValues } from "./dialog";

type McpClientToolNodeData = Partial<McpClientToolFormValues>;
type McpClientToolNodeType = Node<McpClientToolNodeData>;

export const McpClientToolNode = memo((props: NodeProps<McpClientToolNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const toolIcon = currentTheme === "dark"
    ? "/logos/mcp-client-tool.svg"
    : "/logos/mcp-client-tool-dark.svg";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MCP_CLIENT_TOOL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMcpClientToolRealtimeToken,
  });

  const handleSubmit = (values: McpClientToolFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
      )
    );
    setDialogOpen(false);
  };

  const data = props.data || {};

  // Build a descriptive label
  const getDescription = () => {
    if (!data.toolName && !data.serverUrl) return "Click to configure";
    if (data.toolName) {
      // Show tool name, truncate if too long
      const toolDisplay = data.toolName.length > 20
        ? `${data.toolName.slice(0, 17)}...`
        : data.toolName;
      return `Tool: ${toolDisplay}`;
    }
    return "Configure tool";
  };

  return (
    <>
      <McpClientToolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={toolIcon}
        name="MCP Tool"
        status={nodeStatus}
        description={getDescription()}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

McpClientToolNode.displayName = "McpClientToolNode";