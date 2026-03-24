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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: string;
    defaultValues?: TelegramTriggerData;
}

export interface TelegramTriggerData {
    updateType?: string;
    [key: string]: unknown;
}

const UPDATE_TYPES = [
    { value: "all", label: "All Updates" },
    { value: "message", label: "Messages" },
    { value: "edited_message", label: "Edited Messages" },
    { value: "channel_post", label: "Channel Posts" },
    { value: "callback_query", label: "Callback Queries (Inline Buttons)" },
    { value: "inline_query", label: "Inline Queries" },
    { value: "chosen_inline_result", label: "Chosen Inline Results" },
    { value: "poll", label: "Polls" },
    { value: "poll_answer", label: "Poll Answers" },
    { value: "my_chat_member", label: "Bot Chat Member Updates" },
    { value: "chat_member", label: "Chat Member Updates" },
    { value: "chat_join_request", label: "Chat Join Requests" },
];

export const TelegramTriggerDialog = ({
    open,
    onOpenChange,
    nodeId,
    defaultValues,
}: Props) => {
    const params = useParams();
    const workflowId = params.workflowId as string;
    const { setNodes } = useReactFlow();

    const [updateType, setUpdateType] = useState(defaultValues?.updateType || "all");

    const handleSave = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, updateType } }
                    : node,
            ),
        );
        onOpenChange(false);
    };

    // Construct the webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/telegram?workflowId=${workflowId}`;

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
                    <DialogTitle className="flex items-center gap-2">
                        <img src="/logos/telegram.svg" alt="Telegram" className="size-6" />
                        Telegram Trigger
                    </DialogTitle>
                    <DialogDescription>
                        Receive updates from your Telegram bot to trigger this workflow.
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
                    </div>

                    {/* Update Type Filter */}
                    <div className="space-y-2">
                        <Label>Update Type Filter</Label>
                        <Select value={updateType} onValueChange={setUpdateType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select update type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {UPDATE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Filter which Telegram updates trigger this workflow
                        </p>
                    </div>

                    {/* Setup Instructions */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions:</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Copy the webhook URL above</li>
                            <li>Set up the webhook using Telegram Bot API:</li>
                            <li className="ml-4">
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    curl -X POST "https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=WEBHOOK_URL"
                                </code>
                            </li>
                            <li>Send a message to your bot to test</li>
                        </ol>
                    </div>

                    {/* Available Variables */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{telegram.message.text}}"}</code> - Message text</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{telegram.message.from.first_name}}"}</code> - Sender name</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{telegram.message.chat.id}}"}</code> - Chat ID</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{telegram.update_id}}"}</code> - Update ID</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{telegram.callback_query}}"}</code> - Callback data (buttons)</li>
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
