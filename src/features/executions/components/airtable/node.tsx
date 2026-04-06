"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { AirtableDialog, type AirtableFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { AIRTABLE_CHANNEL_NAME } from "@/inngest/channels/airtable";
import { fetchAirtableRealtimeToken } from "./actions";

type AirtableNodeData = {
  variableName?: string;
  credentialId?: string;
  resource?: "base" | "record";
  operation?: string;
  baseId?: string;
  tableIdOrName?: string;
  recordId?: string;
  fields?: string;
  filterByFormula?: string;
  maxRecords?: string;
  view?: string;
};

type AirtableNodeType = Node<AirtableNodeData>;

export const AirtableNode = memo((props: NodeProps<AirtableNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const airtableIcon = "/logos/airtable.svg";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AIRTABLE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAirtableRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AirtableFormValues) => {
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
  const description =
    nodeData?.resource && nodeData?.operation
      ? `${nodeData.resource}: ${nodeData.operation}`
      : "Not configured";

  return (
    <>
      <AirtableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={airtableIcon}
        name="Airtable"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AirtableNode.displayName = "AirtableNode";
