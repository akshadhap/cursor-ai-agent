"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { SendgridDialog, SendgridFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSendgridRealtimeToken } from "./actions";
import { SENDGRID_CHANNEL_NAME } from "@/inngest/channels/sendgrid";

type SendgridNodeData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

type SendgridNodeType = Node<SendgridNodeData>;

export const SendgridNode = memo((props: NodeProps<SendgridNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SENDGRID_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSendgridRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SendgridFormValues) => {
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
      <SendgridDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/sendgrid.png" // add this file or change to a lucide icon
        name="SendGrid Email"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SendgridNode.displayName = "SendgridNode";
