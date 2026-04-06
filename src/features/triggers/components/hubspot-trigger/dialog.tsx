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
import { useState, useEffect } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: string;
    defaultValues?: HubspotTriggerData;
};

export interface HubspotTriggerData {
    objectType?: string;
    eventType?: string;
    [key: string]: unknown;
}

// HubSpot event types by object (like n8n)
const HUBSPOT_EVENTS = {
    contact: [
        { value: "contact.creation", label: "Contact Created" },
        { value: "contact.deletion", label: "Contact Deleted" },
        { value: "contact.propertyChange", label: "Contact Property Changed" },
        { value: "contact.merge", label: "Contacts Merged" },
        { value: "contact.associationChange", label: "Contact Association Changed" },
    ],
    company: [
        { value: "company.creation", label: "Company Created" },
        { value: "company.deletion", label: "Company Deleted" },
        { value: "company.propertyChange", label: "Company Property Changed" },
        { value: "company.merge", label: "Companies Merged" },
        { value: "company.associationChange", label: "Company Association Changed" },
    ],
    deal: [
        { value: "deal.creation", label: "Deal Created" },
        { value: "deal.deletion", label: "Deal Deleted" },
        { value: "deal.propertyChange", label: "Deal Property Changed" },
        { value: "deal.associationChange", label: "Deal Association Changed" },
    ],
    ticket: [
        { value: "ticket.creation", label: "Ticket Created" },
        { value: "ticket.deletion", label: "Ticket Deleted" },
        { value: "ticket.propertyChange", label: "Ticket Property Changed" },
    ],
};

const OBJECT_TYPES = [
    { value: "contact", label: "Contact" },
    { value: "company", label: "Company" },
    { value: "deal", label: "Deal" },
    { value: "ticket", label: "Ticket" },
];

export const HubspotTriggerDialog = ({
    open,
    onOpenChange,
    nodeId,
    defaultValues,
}: Props) => {
    const params = useParams();
    const workflowId = params.workflowId as string;
    const { setNodes } = useReactFlow();

    const [objectType, setObjectType] = useState(defaultValues?.objectType || "");
    const [eventType, setEventType] = useState(defaultValues?.eventType || "");

    // Reset event type when object type changes
    useEffect(() => {
        if (objectType && defaultValues?.objectType !== objectType) {
            setEventType("");
        }
    }, [objectType, defaultValues?.objectType]);

    // Update node data when values change
    const handleSave = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, objectType, eventType } }
                    : node,
            ),
        );
        onOpenChange(false);
    };

    // Construct the webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const webhookUrl =
        `${baseUrl}/api/webhooks/hubspot?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard");
        } catch {
            toast.error("Failed to copy URL");
        }
    };

    const availableEvents = objectType
        ? HUBSPOT_EVENTS[objectType as keyof typeof HUBSPOT_EVENTS] || []
        : [];

    const getEventLabel = () => {
        if (!objectType || !eventType) return "Any HubSpot event";
        const event = availableEvents.find(e => e.value === eventType);
        return event?.label || eventType;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>HubSpot Trigger Configuration</DialogTitle>
                    <DialogDescription>
                        Configure which HubSpot events should trigger this workflow.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Event Configuration */}
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium text-sm">Event Filter</h4>

                        <div className="space-y-2">
                            <Label>Object Type</Label>
                            <Select value={objectType} onValueChange={setObjectType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select object type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {OBJECT_TYPES.map((obj) => (
                                        <SelectItem key={obj.value} value={obj.value}>
                                            {obj.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {objectType && (
                            <div className="space-y-2">
                                <Label>Event Type</Label>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select event..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEvents.map((event) => (
                                            <SelectItem key={event.value} value={event.value}>
                                                {event.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {eventType && (
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    ✓ Workflow will trigger on: <strong>{getEventLabel()}</strong>
                                </p>
                            </div>
                        )}
                    </div>

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

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup instructions:</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Go to HubSpot Developer Portal</li>
                            <li>Open your app → Webhooks</li>
                            <li>Add the webhook URL above</li>
                            <li>Subscribe to: <strong>{eventType || "your chosen event"}</strong></li>
                            <li>Save and activate</li>
                        </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{hubspot.eventType}}"}</code> - Event type</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{hubspot.objectId}}"}</code> - Object ID</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{hubspot.objectType}}"}</code> - Object type</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{hubspot.propertyName}}"}</code> - Changed property</li>
                            <li><code className="bg-background px-1 py-0.5 rounded">{"{{hubspot.propertyValue}}"}</code> - New value</li>
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
