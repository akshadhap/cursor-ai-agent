"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleDriveDialog, GoogleDriveFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchGoogleDriveRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_CHANNEL_NAME } from "@/inngest/channels/google-drive";

const OPERATION_LABELS: Record<string, string> = {
  // File operations
  list_files: "List Files",
  get_file: "Get File Info",
  create_file: "Create File",
  update_file: "Update File",
  download_file: "Download File",
  upload_file: "Upload File",
  copy_file: "Copy File",
  move_file: "Move File",
  delete_file: "Delete File",
  search_files: "Search Files",
  // Folder operations
  create_folder: "Create Folder",
  list_folder_contents: "List Folder Contents",
  get_folder: "Get Folder Info",
  // Sharing operations
  share_file: "Share File/Folder",
  list_permissions: "List Permissions",
  update_permission: "Update Permission",
  remove_permission: "Remove Permission",
  // Google Docs operations
  create_document: "Create Google Doc",
  create_spreadsheet: "Create Google Sheet",
  create_presentation: "Create Google Slides",
  export_document: "Export Document",
};

type GoogleDriveNodeType = Node<GoogleDriveFormValues>;

export const GoogleDriveNode = memo((props: NodeProps<GoogleDriveNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const nodeData = props.data as GoogleDriveFormValues & Record<string, unknown>;

  const handleSubmit = (values: GoogleDriveFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
    setDialogOpen(false);
  };

  const getDescription = () => {
    if (!nodeData?.operation) return "Click to configure";
    return OPERATION_LABELS[nodeData.operation] || nodeData.operation;
  };

  return (
    <>
      <GoogleDriveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        name="Google Drive"
        icon="/logos/google-drive.svg"
        status={nodeStatus}
        description={getDescription()}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

GoogleDriveNode.displayName = "GoogleDriveNode";
