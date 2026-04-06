// src/app/features/executions/components/wait/node.tsx
"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { WaitDialog, type WaitFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchWaitRealtimeToken } from "./actions";
import { WAIT_CHANNEL_NAME } from "@/inngest/channels/wait";
import { Clock } from "lucide-react";

type WaitNodeData = {
  delayDays?: number;
  delayHours?: number;
  delayMinutes?: number;
};

type WaitNodeType = Node<WaitNodeData>;

export const WaitNode = memo((props: NodeProps<WaitNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WAIT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWaitRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: WaitFormValues) => {
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

  const data = props.data ?? {};
  const days = data.delayDays ?? 0;
  const hours = data.delayHours ?? 0;
  const minutes = data.delayMinutes ?? 0;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || (!days && !hours && !minutes)) {
    parts.push(`${minutes}m`);
  }
  const description = `Wait ${parts.join(" ")}`;

  return (
    <>
      <WaitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Clock} // create any icon or reuse another
        name="Wait"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WaitNode.displayName = "WaitNode";
