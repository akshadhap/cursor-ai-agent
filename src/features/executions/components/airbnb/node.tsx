"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { AirbnbDialog, type AirbnbFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { AIRBNB_CHANNEL_NAME } from "@/inngest/channels/airbnb";
import { fetchAirbnbRealtimeToken } from "./actions";

type AirbnbNodeData = Partial<AirbnbFormValues>;
type AirbnbNodeType = Node<AirbnbNodeData>;

export const AirbnbNode = memo((props: NodeProps<AirbnbNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AIRBNB_CHANNEL_NAME,
    topic: "status",
    refreshToken: async () => {
      return await fetchAirbnbRealtimeToken(props.id);
    },
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AirbnbFormValues) => {
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

  // Build description
  const getDescription = () => {
    if (!nodeData?.resource) return "Not configured";
    const resource = nodeData.resource.charAt(0).toUpperCase() + nodeData.resource.slice(1);
    const operation = nodeData.operation || "get";
    return `${resource}: ${operation}`;
  };

  return (
    <>
      <AirbnbDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/airbnb.svg"
        name="Airbnb"
        status={nodeStatus}
        description={getDescription()}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AirbnbNode.displayName = "AirbnbNode";