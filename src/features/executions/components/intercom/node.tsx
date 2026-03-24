"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { IntercomDialog, type IntercomFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { INTERCOM_CHANNEL_NAME } from "@/inngest/channels/intercom";
import { fetchIntercomRealtimeToken } from "./actions";

type IntercomNodeData = {
  variableName?: string;
  credentialId?: string;
  resource?: "contact" | "conversation" | "company";
  operation?: string;
  contactId?: string;
  conversationId?: string;
  companyId?: string;
  email?: string;
  name?: string;
  phone?: string;
  customAttributes?: string;
  messageBody?: string;
  messageType?: string;
  query?: string;
};

type IntercomNodeType = Node<IntercomNodeData>;

export const IntercomNode = memo((props: NodeProps<IntercomNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const intercomIcon = currentTheme === "dark" ? "/logos/intercom-white.svg" : "/logos/intercom.svg";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: INTERCOM_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIntercomRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: IntercomFormValues) => {
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
      <IntercomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={intercomIcon}
        name="Intercom"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

IntercomNode.displayName = "IntercomNode";