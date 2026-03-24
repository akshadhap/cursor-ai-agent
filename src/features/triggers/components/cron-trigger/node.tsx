import { type Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { Clock } from "lucide-react";
import { CronTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CRON_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/cron-trigger";
import { fetchCronTriggerRealtimeToken } from "./actions";

type CronTriggerNodeData = {
    cronExpression?: string;
    timezone?: string;
    description?: string;
};

type CronTriggerNodeType = Node<CronTriggerNodeData>;

export const CronTriggerNode = memo((props: NodeProps<CronTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: CRON_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchCronTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: CronTriggerNodeData) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === props.id
                    ? { ...node, data: { ...node.data, ...values } }
                    : node,
            ),
        );
    };

    const nodeData = props.data as CronTriggerNodeData;

    // Generate display name from cron expression
    const getDisplayName = () => {
        if (nodeData?.description) return nodeData.description;
        if (nodeData?.cronExpression) return `Schedule: ${nodeData.cronExpression}`;
        return "When scheduled (CRON)";
    };

    return (
        <>
            <CronTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultValues={nodeData}
                onSubmit={handleSubmit}
            />
            <BaseTriggerNode
                {...props}
                icon={Clock}
                name={getDisplayName()}
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});

CronTriggerNode.displayName = "CronTriggerNode";
