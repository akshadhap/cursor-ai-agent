"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { Smtp2goDialog, Smtp2goFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSmtp2goRealtimeToken } from "./actions";
import { SMTP2GO_CHANNEL_NAME } from "@/inngest/channels/smtp2go";

type Smtp2goNodeData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

type Smtp2goNodeType = Node<Smtp2goNodeData>;

export const Smtp2goNode = memo((props: NodeProps<Smtp2goNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SMTP2GO_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSmtp2goRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: Smtp2goFormValues) => {
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
  };

  const nodeData = props.data;
  const description = nodeData?.to
    ? `To: ${nodeData.to} • ${nodeData.subject ?? ""}`
    : "Not configured";

  return (
    <>
      <Smtp2goDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/smtp2go.svg" // create this or swap for an icon
        name="SMTP2GO Email"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

Smtp2goNode.displayName = "Smtp2goNode";
