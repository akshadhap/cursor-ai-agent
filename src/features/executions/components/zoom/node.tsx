"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { ZoomDialog, ZoomFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchZoomRealtimeToken } from "./actions";
import { ZOOM_CHANNEL_NAME } from "@/inngest/channels/zoom";

type ZoomNodeData = {
  variableName?: string;
  credentialId?: string;
  operation?: string;
  meetingId?: string;
  meetingTopic?: string;
  meetingDescription?: string;
  duration?: string;
  startTime?: string;
  timezone?: string;
  pageSize?: number;
};

type ZoomNodeType = Node<ZoomNodeData>;

export const ZoomNode = memo((props: NodeProps<ZoomNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: ZOOM_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchZoomRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ZoomFormValues) => {
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
  };

  const nodeData = props.data;

  // Generate description based on operation
  const getDescription = () => {
    const op = nodeData?.operation || "create_meeting";
    switch (op) {
      case "create_meeting":
        return nodeData?.meetingTopic
          ? `Create: ${nodeData.meetingTopic} • ${nodeData.duration}min`
          : "Create Meeting";
      case "get_meeting":
        return nodeData?.meetingId
          ? `Get Meeting: ${nodeData.meetingId}`
          : "Get Meeting";
      case "update_meeting":
        return nodeData?.meetingId
          ? `Update Meeting: ${nodeData.meetingId}`
          : "Update Meeting";
      case "delete_meeting":
        return nodeData?.meetingId
          ? `Delete Meeting: ${nodeData.meetingId}`
          : "Delete Meeting";
      case "list_meetings":
        return "List Meetings";
      default:
        return "Not configured";
    }
  };

  return (
    <>
      <ZoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/zoom.svg"
        name="Zoom Meeting"
        status={nodeStatus}
        description={getDescription()}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ZoomNode.displayName = "ZoomNode";
