"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";

import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchMcpClientRealtimeToken } from "./actions";
import { MCP_CLIENT_CHANNEL_NAME } from "@/inngest/channels/mcp_client";
import { McpClientDialog, McpClientFormValues } from "./dialog";

type McpClientNodeData = Partial<McpClientFormValues>;
type McpClientNodeType = Node<McpClientNodeData>;

export const McpClientNode = memo((props: NodeProps<McpClientNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const mcpIcon = currentTheme === "dark" ? "/logos/mcp-client.png" : "/logos/mcp-client-black.png";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MCP_CLIENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMcpClientRealtimeToken,
  });

  const handleSubmit = (values: McpClientFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
      )
    );
  };

  const data = props.data || {};
  const desc = data.serverUrl && data.endpoint
    ? `${data.method || "POST"} ${data.serverUrl}${data.endpoint}`
    : "Not configured";

  return (
    <>
      <McpClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={mcpIcon}
        name="MCP Client"
        status={nodeStatus}
        description={desc}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

McpClientNode.displayName = "McpClientNode";
