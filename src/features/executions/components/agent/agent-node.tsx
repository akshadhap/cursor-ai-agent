"use client";

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { AgentExecutionNode, type AgentExecutionNodeData } from "@/features/executions/components/agent/agent-execution-node";

type AgentNodeType = Node<AgentExecutionNodeData>;

export const AgentNode = memo((props: NodeProps<AgentNodeType>) => {
  return <AgentExecutionNode {...props} />;
});

AgentNode.displayName = "AgentNode";
