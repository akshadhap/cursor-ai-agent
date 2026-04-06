"use client";

import { NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { TelegramTriggerDialog, TelegramTriggerData } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchTelegramTriggerRealtimeToken } from "./actions";
import { TELEGRAM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/telegram-trigger";

type TelegramTriggerNodeType = Node<TelegramTriggerData>;

export const TelegramTriggerNode = memo((props: NodeProps<TelegramTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const nodeData = props.data as TelegramTriggerData;

    const getDescription = () => {
        if (nodeData?.updateType) {
            return `Update: ${nodeData.updateType}`;
        }
        return "Click to configure";
    };

    return (
        <>
            <TelegramTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                nodeId={props.id}
                defaultValues={nodeData}
            />
            <BaseTriggerNode
                {...props}
                icon="/logos/telegram.svg"
                name="Telegram Trigger"
                description={getDescription()}
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

TelegramTriggerNode.displayName = "TelegramTriggerNode";
