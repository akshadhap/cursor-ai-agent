import { NodeProps, useReactFlow, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { HubspotTriggerDialog, HubspotTriggerData } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchHubspotTriggerRealtimeToken } from "./actions";
import { HUBSPOT_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/hubspot-trigger";

// Event type labels for display
const EVENT_LABELS: Record<string, string> = {
    "contact.creation": "Contact Created",
    "contact.deletion": "Contact Deleted",
    "contact.propertyChange": "Contact Property Changed",
    "company.creation": "Company Created",
    "company.deletion": "Company Deleted",
    "company.propertyChange": "Company Property Changed",
    "deal.creation": "Deal Created",
    "deal.deletion": "Deal Deleted",
    "deal.propertyChange": "Deal Property Changed",
    "ticket.creation": "Ticket Created",
    "ticket.deletion": "Ticket Deleted",
    "ticket.propertyChange": "Ticket Property Changed",
};

type HubspotTriggerNodeType = Node<HubspotTriggerData>;

export const HubspotTriggerNode = memo((props: NodeProps<HubspotTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: HUBSPOT_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchHubspotTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const nodeData = props.data as HubspotTriggerData;

    const getDescription = () => {
        if (nodeData?.eventType) {
            return EVENT_LABELS[nodeData.eventType] || nodeData.eventType;
        }
        return "Click to configure event";
    };

    return (
        <>
            <HubspotTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                nodeId={props.id}
                defaultValues={nodeData}
            />
            <BaseTriggerNode
                {...props}
                icon="/logos/hubspot.svg"
                name="HubSpot"
                description={getDescription()}
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});

HubspotTriggerNode.displayName = "HubspotTriggerNode";
