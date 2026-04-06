// src/features/executions/components/agent/ingestion/node.tsx
"use client";

import { memo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { LEAD_INGESTION_CHANNEL_NAME } from "@/inngest/channels/lead-ingestion";
import { fetchLeadIngestionRealtimeToken } from "./actions";
import { LeadIngestionDialog, IngestionFormValues } from "./dialog";

type SourceType = "WEBFORM" | "EXCEL" | "CRM";

export type LeadIngestionNodeData = {
  variableName?: string;
  source?: SourceType;
  inputPath?: string;
  outputPath?: string;

  fullName?: string;
  email?: string;
  companyName?: string;
  phoneNumber?: string;
  role?: string;
  budgetRange?: string;
  companySize?: string;
  projectUrgency?: string;
  leadSource?: string;
};



type LeadIngestionNodeType = Node<LeadIngestionNodeData>;

export const LeadIngestionNode = memo(
  (props: NodeProps<LeadIngestionNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: LEAD_INGESTION_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchLeadIngestionRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    // 🔴 EXACTLY like Gemini: flat-merge values into node.data
    const handleSubmit = (values: IngestionFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...values, // variableName, inputPath, outputPath, source
                },
              }
            : node,
        ),
      );
    };

    const nodeData = props.data ?? {};

    // Description logic: driven by flat `data.source`, just like Gemini uses `data.userPrompt`
    let description = "Not configured";
    if (nodeData.source === "WEBFORM") {
      description = "Leads from contact form";
    } else if (nodeData.source === "EXCEL") {
      description = "Leads from Excel / CSV upload";
    } else if (nodeData.source === "CRM") {
      description = "Leads from connected CRM";
    }

    return (
      <>
        <LeadIngestionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          // 🔴 IMPORTANT: pass current node.data back into the form
          defaultValues={nodeData as IngestionFormValues}
        />

        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={BotIcon}
          name="Lead Ingestion"
          status={nodeStatus}
          description={description}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

LeadIngestionNode.displayName = "LeadIngestionNode";
