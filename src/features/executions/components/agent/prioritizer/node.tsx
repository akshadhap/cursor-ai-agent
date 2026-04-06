// REPLACE ENTIRE FILE

"use client";

import { memo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { LEAD_PRIORITIZER_CHANNEL_NAME } from "@/inngest/channels/lead-prioritizer";
import { fetchLeadPrioritizerRealtimeToken } from "./actions";
import { LeadPrioritizerDialog } from "./dialog";

type LeadPrioritizerNodeData = {};

export const LeadPrioritizerNode = memo(
  (props: NodeProps<Node<LeadPrioritizerNodeData>>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const status = useNodeStatus({
      nodeId: props.id,
      channel: LEAD_PRIORITIZER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchLeadPrioritizerRealtimeToken,
    });

    const handleSubmit = () => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: {} } : n
        )
      );
    };

    return (
      <>
        <LeadPrioritizerDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmit}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          name="Lead Prioritizer"
          icon={BotIcon}
          status={status}
          description="Sorts and prioritizes leads using Gemini"
          onSettings={() => setOpen(true)}
          onDoubleClick={() => setOpen(true)}
        />
      </>
    );
  }
);

LeadPrioritizerNode.displayName = "LeadPrioritizerNode";
