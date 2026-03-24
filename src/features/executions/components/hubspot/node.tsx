"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { HubSpotDialog, type HubSpotFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { HUBSPOT_CHANNEL_NAME } from "@/inngest/channels/hubspot";
import { fetchHubSpotRealtimeToken } from "./actions";

type HubSpotNodeData = {
  variableName?: string;
  credentialId?: string;
  resource?: "contact" | "company" | "deal" | "ticket" | "conversation";
  operation?: string;
  
  // Contact fields
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  
  // Company fields
  companyName?: string;
  domain?: string;
  
  // Deal fields
  dealName?: string;
  dealStage?: string;
  amount?: string;
  
  // Ticket fields
  subject?: string;
  content?: string;
  priority?: string;
  status?: string;
  category?: string;
  
  // Conversation fields
  conversationId?: string;
  
  // Common
  contactId?: string;
  companyId?: string;
  dealId?: string;
  ticketId?: string;
  customProperties?: string;
  limit?: string;
  searchQuery?: string;
};

type HubSpotNodeType = Node<HubSpotNodeData>;

export const HubSpotNode = memo((props: NodeProps<HubSpotNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: HUBSPOT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchHubSpotRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: HubSpotFormValues) => {
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
      <HubSpotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/hubspot.svg"
        name="HubSpot"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

HubSpotNode.displayName = "HubSpotNode";
