"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { PineconeDialog, type PineconeFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { PINECONE_CHANNEL_NAME } from "@/inngest/channels/pinecone";
import { fetchPineconeRealtimeToken } from "./actions";

type PineconeNodeData = {
    variableName?: string;
    credentialId?: string;
    resource?: "vector" | "index";
    operation?: string;
    indexName?: string;
    indexHost?: string;
    namespace?: string;
    vectorId?: string;
    vectorIds?: string;
    values?: string;
    metadata?: string;
    topK?: string;
    queryVector?: string;
    filter?: string;
    includeMetadata?: string;
    includeValues?: string;
};

type PineconeNodeType = Node<PineconeNodeData>;

export const PineconeNode = memo((props: NodeProps<PineconeNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const { theme, systemTheme } = useTheme();

    const currentTheme = theme === "system" ? systemTheme : theme;
    const pineconeIcon = currentTheme === "dark" ? "/logos/pinecone-white.svg" : "/logos/pinecone.svg";

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: PINECONE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchPineconeRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: PineconeFormValues) => {
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
            <PineconeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={pineconeIcon}
                name="Pinecone"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

PineconeNode.displayName = "PineconeNode";
