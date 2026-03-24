// src/features/executions/components/agent/followups/node.tsx
"use client";

import { memo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { LEAD_FOLLOWUPS_CHANNEL_NAME } from "@/inngest/channels/lead-followups";
import { fetchLeadFollowupsRealtimeToken } from "./actions";
import { LeadFollowupsDialog, FollowupsFormValues } from "./dialog";

type LeadFollowupsNodeData = {
  variableName?: string;
  inputPath?: string;
  emailField?: string;
  fromEmail?: string;
  followupCount?: number;
  subjectTemplate?: string;
  bodyTemplate?: string;
  followupStatusField?: string;
};

type LeadFollowupsNodeType = Node<LeadFollowupsNodeData>;

export const LeadFollowupsNode = memo(
  (props: NodeProps<LeadFollowupsNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const status = useNodeStatus({
      nodeId: props.id,
      channel: LEAD_FOLLOWUPS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchLeadFollowupsRealtimeToken,
    });

    const onSubmit = (values: FollowupsFormValues) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n,
        ),
      );
    };

    const data = props.data;
    const desc = data?.inputPath
      ? `Send ${data.followupCount || 3} followups to ${data.inputPath}`
      : "Not configured";

    return (
      <>
        <LeadFollowupsDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={onSubmit}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={BotIcon}
          name="Lead Followups"
          status={status}
          description={desc}
          onSettings={() => setOpen(true)}
          onDoubleClick={() => setOpen(true)}
        />
      </>
    );
  },
);

LeadFollowupsNode.displayName = "LeadFollowupsNode";
