// src/features/executions/components/agent/outreach/node.tsx
"use client";

import { memo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { LEAD_OUTREACH_CHANNEL_NAME } from "@/inngest/channels/lead-outreach";
import { fetchLeadOutreachRealtimeToken } from "./actions";
import { LeadOutreachDialog, OutreachFormValues } from "./dialog";

type LeadOutreachNodeData = {
  subjectTemplate?: string;
  bodyTemplate?: string;
};

type LeadOutreachNodeType = Node<LeadOutreachNodeData>;

export const LeadOutreachNode = memo(
  (props: NodeProps<LeadOutreachNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const status = useNodeStatus({
      nodeId: props.id,
      channel: LEAD_OUTREACH_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchLeadOutreachRealtimeToken,
    });

    const handleSubmit = (values: OutreachFormValues) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n,
        ),
      );
    };

    const d = props.data;
    const desc = d?.subjectTemplate
      ? "Cold outreach via Gemini + SMTP2GO"
      : "Not configured";

    return (
      <>
        <LeadOutreachDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmit}
          defaultValues={d}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={BotIcon}
          name="Lead Cold Outreach"
          status={status}
          description={desc}
          onSettings={() => setOpen(true)}
          onDoubleClick={() => setOpen(true)}
        />
      </>
    );
  },
);

LeadOutreachNode.displayName = "LeadOutreachNode";
