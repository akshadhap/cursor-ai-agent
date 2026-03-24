"use client";

import { memo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { LEAD_QUALIFIER_CHANNEL_NAME } from "@/inngest/channels/lead-qualifier";
import { fetchLeadQualifierRealtimeToken } from "./actions";
import { LeadQualifierDialog, QualifierFormValues } from "./dialog";

type LeadQualifierNodeData = {
  variableName?: string;
  inputPath?: string;
  outputPath?: string;
  scoreField?: string;
  stageField?: string;

  // ✅ Single threshold field
  minimumScore?: number;
};

type LeadQualifierNodeType = Node<LeadQualifierNodeData>;

export const LeadQualifierNode = memo(
  (props: NodeProps<LeadQualifierNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: LEAD_QUALIFIER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchLeadQualifierRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    // ✅ Same pattern as GeminiNode: merge form values into node.data
    const handleSubmit = (values: QualifierFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...values,
                },
              }
            : node,
        ),
      );
    };

    const nodeData = props.data;
    const description = nodeData?.inputPath
      ? `Qualify ${nodeData.inputPath || "leads"} → ${
          nodeData.outputPath || "leads"
        }` +
        (typeof nodeData.minimumScore === "number"
          ? ` (min score ${nodeData.minimumScore})`
          : "")
      : "Not configured";

    return (
      <>
        <LeadQualifierDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={BotIcon}
          name="Lead Qualifier"
          status={nodeStatus}
          description={description}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

LeadQualifierNode.displayName = "LeadQualifierNode";
