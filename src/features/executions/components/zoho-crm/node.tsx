"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { ZohoDialog, ZohoFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchZohoRealtimeToken } from "./actions";
import { ZOHO_CRM_CHANNEL_NAME } from "@/inngest/channels/zoho-crm";

type ZohoNodeData = {
    credentialId?: string;
    resource?: string;
    operation?: string;
    variableName?: string;
    recordId?: string;
    additionalFields?: { key: string; value: string }[];
};

type ZohoNodeType = Node<ZohoNodeData>;

export const ZohoNode = memo((props: NodeProps<ZohoNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: ZOHO_CRM_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchZohoRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ZohoFormValues) => {
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
    const description = nodeData?.resource
        ? `${nodeData.operation || "Operation"} on ${nodeData.resource}`
        : "Not configured";

    return (
        <>
            <ZohoDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/zoho-crm.svg"
                name="Zoho CRM"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

ZohoNode.displayName = "ZohoNode";
