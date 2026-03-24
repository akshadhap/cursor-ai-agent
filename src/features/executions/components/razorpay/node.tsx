"use client";

import type { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useReactFlow, type Node } from "@xyflow/react";
import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { RazorpayDialog, type RazorpayFormValues } from "./dialog";
import { fetchRazorpayRealtimeToken } from "./actions";
import { RAZORPAY_CHANNEL_NAME } from "@/inngest/channels/razorpay";

type RazorpayNodeData = Partial<RazorpayFormValues>;

type RazorpayNodeType = Node<RazorpayNodeData>;

export const RazorpayNode = memo((props: NodeProps<RazorpayNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const status = useNodeStatus({
    nodeId: props.id,
    channel: RAZORPAY_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchRazorpayRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: RazorpayFormValues) => {
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
      })
    );
    setDialogOpen(false);
  };

  const nodeData = props.data;
  const actionLabels = {
    CREATE_PAYMENT_LINK: "Create Payment Link",
    CREATE_ORDER: "Create Order",
    FETCH_PAYMENT: "Fetch Payment",
    FETCH_ORDER: "Fetch Order",
    FETCH_PAYMENT_LINK: "Fetch Payment Link",
    CREATE_REFUND: "Create Refund",
    FETCH_REFUND: "Fetch Refund",
  };
  const description = nodeData?.action
    ? actionLabels[nodeData.action as keyof typeof actionLabels] || "Not configured"
    : "Not configured";

  return (
    <>
      <RazorpayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/razorpay.png"
        name="Razorpay"
        status={status}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

RazorpayNode.displayName = "RazorpayNode";