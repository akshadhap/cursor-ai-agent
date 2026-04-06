"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { TelegramDialog, type TelegramFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram";
import { fetchTelegramRealtimeToken } from "./actions";

type TelegramNodeData = {
  variableName?: string;
  credentialId?: string;
  resource?: string;
  operation?: string;
  chatId?: string;
  text?: string;
  photo?: string;
  document?: string;
  caption?: string;
  parseMode?: string;
  messageId?: string;
  disableNotification?: string;
};

type TelegramNodeType = Node<TelegramNodeData>;

export const TelegramNode = memo((props: NodeProps<TelegramNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: TELEGRAM_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchTelegramRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: TelegramFormValues) => {
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
      <TelegramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/telegram.svg"
        name="Telegram"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

TelegramNode.displayName = "TelegramNode";
