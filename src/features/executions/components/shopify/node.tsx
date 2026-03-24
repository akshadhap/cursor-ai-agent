"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";

import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { ShopifyDialog, ShopifyFormValues } from "./dialog";
import { fetchShopifyRealtimeToken } from "./actions";
import { SHOPIFY_CHANNEL_NAME } from "@/inngest/channels/shopify";

type ShopifyNodeData = Partial<ShopifyFormValues>;
type ShopifyNodeType = Node<ShopifyNodeData>;

// Format operation name for display
const formatOperation = (operation?: string): string => {
  if (!operation) return "";
  // Convert camelCase to Title Case with spaces
  return operation
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Format resource name for display
const formatResource = (resource?: string): string => {
  if (!resource) return "";
  return resource.charAt(0).toUpperCase() + resource.slice(1);
};

// Get a descriptive label for the node
const getNodeDescription = (data: ShopifyNodeData): string => {
  if (!data.resource || !data.operation) {
    return "Click to configure";
  }
  
  const resource = formatResource(data.resource);
  const operation = formatOperation(data.operation);
  
  return `${resource}: ${operation}`;
};

export const ShopifyNode = memo((props: NodeProps<ShopifyNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SHOPIFY_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchShopifyRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const nodeData = props.data;

  const handleSubmit = (values: ShopifyFormValues) => {
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
    setDialogOpen(false);
  };

  const description = getNodeDescription(nodeData);

  return (
    <>
      <ShopifyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/shopify.svg"
        name="Shopify"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});