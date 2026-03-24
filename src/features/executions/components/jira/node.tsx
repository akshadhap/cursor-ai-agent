"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { JiraDialog, type JiraFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { JIRA_CHANNEL_NAME } from "@/inngest/channels/jira";
import { fetchJiraRealtimeToken } from "./actions";

type JiraNodeData = {
    variableName?: string;
    credentialId?: string;
    resource?: string;
    operation?: string;
    projectKey?: string;
    issueIdOrKey?: string;
    issueType?: string;
    summary?: string;
    description?: string;
    assignee?: string;
    priority?: string;
    jql?: string;
    transitionId?: string;
    fields?: string;
};

type JiraNodeType = Node<JiraNodeData>;

export const JiraNode = memo((props: NodeProps<JiraNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: JIRA_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchJiraRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: JiraFormValues) => {
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
            <JiraDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/jira.svg"
                name="Jira"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

JiraNode.displayName = "JiraNode";
