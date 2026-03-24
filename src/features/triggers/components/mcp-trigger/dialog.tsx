"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: string;
    defaultValues?: McpTriggerData;
}

export interface McpTriggerData {
    eventType?: string;
    serverName?: string;
    [key: string]: unknown;
}

export const McpTriggerDialog = ({
    open,
    onOpenChange,
    nodeId,
    defaultValues,
}: Props) => {
    const params = useParams();
    const workflowId = params.workflowId as string;
    const { setNodes } = useReactFlow();

    const [eventType, setEventType] = useState(defaultValues?.eventType || "");
    const [serverName, setServerName] = useState(defaultValues?.serverName || "");

    const handleSave = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, eventType, serverName } }
                    : node,
            ),
        );
        onOpenChange(false);
    };

    // Construct the webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/mcp?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard");
        } catch {
            toast.error("Failed to copy URL");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>MCP Trigger Configuration</DialogTitle>
                    <DialogDescription>
                        Configure this trigger to receive events from MCP servers.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Webhook URL */}
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <div className="flex gap-2">
                            <Input
                                id="webhook-url"
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copyToClipboard}
                            >
                                <CopyIcon className="size-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Send POST requests to this URL from your MCP server
                        </p>
                    </div>

                    {/* Event Filter */}
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium text-sm">Event Filters (Optional)</h4>

                        <div className="space-y-2">
                            <Label htmlFor="event-type">Event Type</Label>
                            <Input
                                id="event-type"
                                placeholder="e.g., message, tool_call, completion"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to receive all event types
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="server-name">Server Name</Label>
                            <Input
                                id="server-name"
                                placeholder="e.g., my-mcp-server"
                                value={serverName}
                                onChange={(e) => setServerName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to receive events from all servers
                            </p>
                        </div>
                    </div>

                    {/* Setup Instructions */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions:</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Copy the webhook URL above</li>
                            <li>Configure your MCP server to send events to this URL</li>
                            <li>Include event data in the POST body as JSON</li>
                            <li>The workflow will trigger on each incoming event</li>
                        </ol>
                    </div>

                    {/* Expected Payload */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Expected Payload Format:</h4>
                        <pre className="text-xs text-muted-foreground bg-background p-2 rounded overflow-x-auto">
                            {`{
  "eventType": "message",
  "serverName": "my-server",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}`}
                        </pre>
                    </div>

                    {/* Available Variables */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{mcp.eventType}}"}</code> - Event type</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{mcp.serverName}}"}</code> - Server name</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{mcp.data}}"}</code> - Event payload</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{mcp.timestamp}}"}</code> - Event timestamp</li>
                        </ul>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Configuration
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
