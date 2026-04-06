"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import CalendlyDialog, { type CalendlyFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchCalendlyRealtimeToken } from "./actions";
import { CALENDLY_CHANNEL_NAME } from "@/inngest/channels/calendly";

const OPERATION_LABELS: Record<string, string> = {
  list_scheduled_events: "List Events",
  get_scheduled_event: "Get Event",
  cancel_scheduled_event: "Cancel Event",
  list_event_types: "List Event Types",
  get_event_type: "Get Event Type",
  list_event_invitees: "List Invitees",
  get_invitee: "Get Invitee",
  cancel_invitee: "Cancel Invitee",
  get_current_user: "Get User",
  list_organization_members: "List Members",
  create_scheduling_link: "Create Link",
  list_user_availability_schedules: "List Schedules",
  get_user_availability_schedule: "Get Schedule",
  list_user_busy_times: "List Busy Times",
  list_webhook_subscriptions: "List Webhooks",
  create_webhook_subscription: "Create Webhook",
  delete_webhook_subscription: "Delete Webhook",
};

type CalendlyNodeType = Node<CalendlyFormValues>;

export const CalendlyNode = memo((props: NodeProps<CalendlyNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CALENDLY_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchCalendlyRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const nodeData = props.data as CalendlyFormValues & Record<string, unknown>;

  const handleSubmit = (values: CalendlyFormValues) => {
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
      <CalendlyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        name="Calendly"
        icon="/logos/calendly.svg"
        status={nodeStatus}
        description={getDescription()}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

CalendlyNode.displayName = "CalendlyNode";
