"use client";

import { NodeProps, useReactFlow, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseTriggerNode } from "../base-trigger-node";
import { McpTriggerDialog, McpTriggerData } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchMcpTriggerRealtimeToken } from "./actions";
import { MCP_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/mcp-trigger";

type McpTriggerNodeType = Node<McpTriggerData>;

export const McpTriggerNode = memo((props: NodeProps<McpTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { theme, systemTheme } = useTheme();

    const currentTheme = theme === "system" ? systemTheme : theme;
    const mcpIcon = currentTheme === "dark"
        ? "/logos/mcp-client.png"
        : "/logos/mcp-client-black.png";

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: MCP_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchMcpTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const nodeData = props.data as McpTriggerData;

    const getDescription = () => {
        if (nodeData?.eventType) {
            return `Event: ${nodeData.eventType}`;
        }
        if (nodeData?.serverName) {
            return `Server: ${nodeData.serverName}`;
        }
        return "Click to configure";
    };

    return (
        <>
            <McpTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                nodeId={props.id}
                defaultValues={nodeData}
            />
            <BaseTriggerNode
                {...props}
                icon={mcpIcon}
                name="MCP Trigger"
                description={getDescription()}
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

McpTriggerNode.displayName = "McpTriggerNode";
