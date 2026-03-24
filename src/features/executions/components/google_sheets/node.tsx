"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useTheme } from "next-themes";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleSheetsDialog, type GoogleSheetsFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/inngest/channels/google_sheets";
import { fetchGoogleSheetsRealtimeToken } from "./actions";

type GoogleSheetsNodeData = {
    variableName?: string;
    credentialId?: string;
    operation?: string;
    spreadsheetId?: string;
    range?: string;
    values?: string;
    valueInputOption?: string;
    insertDataOption?: string;
};

type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>;

export const GoogleSheetsNode = memo((props: NodeProps<GoogleSheetsNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const sheetsIcon = "/logos/google-sheets.svg";

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: GOOGLE_SHEETS_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchGoogleSheetsRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: GoogleSheetsFormValues) => {
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
        nodeData?.operation
            ? nodeData.operation.replace(/_/g, " ")
            : "Not configured";

    return (
        <>
            <GoogleSheetsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={sheetsIcon}
                name="Google Sheets"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );
});

GoogleSheetsNode.displayName = "GoogleSheetsNode";
