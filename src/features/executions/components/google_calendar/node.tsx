"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleCalendarDialog, type GoogleCalendarFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { GOOGLE_CALENDAR_CHANNEL_NAME } from "@/inngest/channels/google_calendar";
import { fetchGoogleCalendarRealtimeToken } from "./actions";

type GoogleCalendarNodeData = {
    variableName?: string;
    credentialId?: string;
    resource?: "calendar" | "event";
    operation?: string;
    calendarId?: string;
    eventId?: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    attendees?: string;
};

type GoogleCalendarNodeType = Node<GoogleCalendarNodeData>;

export const GoogleCalendarNode = memo((props: NodeProps<GoogleCalendarNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const calendarIcon = "/logos/google-calendar.svg";

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: GOOGLE_CALENDAR_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchGoogleCalendarRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: GoogleCalendarFormValues) => {
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
            <GoogleCalendarDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={calendarIcon}
                name="Google Calendar"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

GoogleCalendarNode.displayName = "GoogleCalendarNode";
