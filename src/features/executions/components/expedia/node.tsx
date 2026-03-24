"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { ExpediaDialog, type ExpediaFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { EXPEDIA_CHANNEL_NAME } from "@/inngest/channels/expedia";
import { fetchExpediaRealtimeToken } from "./actions";

type ExpediaNodeData = Partial<ExpediaFormValues>;

type ExpediaNodeType = Node<ExpediaNodeData>;

export const ExpediaNode = memo((props: NodeProps<ExpediaNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const expediaIcon = currentTheme === "dark"
    ? "/logos/expedia-white.svg"
    : "/logos/expedia.svg";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: EXPEDIA_CHANNEL_NAME,
    topic: "status",
    refreshToken: () => fetchExpediaRealtimeToken(props.id),
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ExpediaFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
    setDialogOpen(false);
  };

  const nodeData = props.data;
  const description =
    nodeData?.resource && nodeData?.operation
      ? `${nodeData.resource}: ${nodeData.operation}`
      : "Not configured";

  return (
    <>
      <ExpediaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={expediaIcon}
        name="Expedia"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ExpediaNode.displayName = "ExpediaNode";