"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { NotionDialog, type NotionFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { NOTION_CHANNEL_NAME } from "@/inngest/channels/notion";
import { fetchNotionRealtimeToken } from "./actions";

type NotionNodeData = {
  variableName?: string;
  credentialId?: string;
  resource?: "database" | "databasePage" | "page" | "block";
  operation?: string;
  databaseId?: string;
  pageId?: string;
  blockId?: string;
  title?: string;
  content?: string;
  properties?: string;
  blockContent?: string;
  blockType?: string;
};

type NotionNodeType = Node<NotionNodeData>;

export const NotionNode = memo((props: NodeProps<NotionNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: NOTION_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchNotionRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: NotionFormValues) => {
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
      <NotionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/notion.svg"
        name="Notion"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

NotionNode.displayName = "NotionNode";
