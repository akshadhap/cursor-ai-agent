"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import ZendeskDialog, { type ZendeskFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchZendeskRealtimeToken } from "./actions";
import { ZENDESK_CHANNEL_NAME } from "@/inngest/channels/zendesk";

const OPERATION_LABELS: Record<string, string> = {
  // Tickets
  list_tickets: "List Tickets",
  get_ticket: "Get Ticket",
  create_ticket: "Create Ticket",
  update_ticket: "Update Ticket",
  delete_ticket: "Delete Ticket",
  add_ticket_comment: "Add Comment",
  get_ticket_comments: "Get Comments",
  // Users
  list_users: "List Users",
  get_user: "Get User",
  create_user: "Create User",
  update_user: "Update User",
  delete_user: "Delete User",
  search_users: "Search Users",
  // Organizations
  list_organizations: "List Organizations",
  get_organization: "Get Organization",
  create_organization: "Create Organization",
  update_organization: "Update Organization",
  delete_organization: "Delete Organization",
  // Groups
  list_groups: "List Groups",
  get_group: "Get Group",
  // Search
  search_tickets: "Search Tickets",
  search_all: "Search All",
};

type ZendeskNodeType = Node<ZendeskFormValues>;

export const ZendeskNode = memo((props: NodeProps<ZendeskNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const zendeskLogo = currentTheme === "dark" ? "/logos/zendesk-white.svg" : "/logos/zendesk.svg";

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: ZENDESK_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchZendeskRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const nodeData = props.data as ZendeskFormValues & Record<string, unknown>;

  const handleSubmit = (values: ZendeskFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
    setDialogOpen(false);
  };

  const getDescription = () => {
    if (!nodeData?.operation) return "Click to configure";
    return OPERATION_LABELS[nodeData.operation] || nodeData.operation;
  };

  return (
    <>
      <ZendeskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        name="Zendesk"
        icon={zendeskLogo}
        status={nodeStatus}
        description={getDescription()}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ZendeskNode.displayName = "ZendeskNode";
