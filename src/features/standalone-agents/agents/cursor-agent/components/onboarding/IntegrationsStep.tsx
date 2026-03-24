/**
 * Integrations Step - Connect Notion, Slack, Jira (Optional)
 */

"use client";

import { useState } from "react";
import {
    ArrowRightIcon,
    ChevronLeftIcon,
    CheckCircle2Icon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IntegrationsStepProps {
    agentId: string;
    onComplete: () => void;
    onBack: () => void;
}

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    connected: boolean;
    isConnecting: boolean;
}

export function IntegrationsStep({
    agentId,
    onComplete,
    onBack,
}: IntegrationsStepProps) {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: "notion",
            name: "Notion",
            description: "Save tasks and notes to your Notion workspace",
            icon: "📝",
            color: "bg-gray-800",
            connected: false,
            isConnecting: false,
        },
        {
            id: "slack",
            name: "Slack",
            description: "Send summaries and insights to Slack channels",
            icon: "💬",
            color: "bg-purple-600",
            connected: false,
            isConnecting: false,
        },
        {
            id: "jira",
            name: "Jira",
            description: "Create and update Jira issues from text",
            icon: "🎯",
            color: "bg-blue-600",
            connected: false,
            isConnecting: false,
        },
    ]);

    const handleConnect = async (integrationId: string) => {
        setIntegrations((prev) =>
            prev.map((i) =>
                i.id === integrationId ? { ...i, isConnecting: true } : i
            )
        );

        try {
            // Redirect to OAuth flow
            const oauthUrl = `/api/standalone-agents/cursor-agent/oauth/${integrationId}?agentId=${agentId}`;
            window.location.href = oauthUrl;
        } catch (error) {
            console.error(`Error connecting ${integrationId}:`, error);
            toast.error(`Failed to connect ${integrationId}`);

            setIntegrations((prev) =>
                prev.map((i) =>
                    i.id === integrationId ? { ...i, isConnecting: false } : i
                )
            );
        }
    };

    const handleDisconnect = async (integrationId: string) => {
        try {
            // Save to backend
            await fetch(`/api/standalone-agents/cursor-agent/integrations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    integration: integrationId,
                    connected: false,
                }),
            });

            setIntegrations((prev) =>
                prev.map((i) =>
                    i.id === integrationId ? { ...i, connected: false } : i
                )
            );

            toast.success(`${integrationId} disconnected`);
        } catch (error) {
            console.error(`Error disconnecting ${integrationId}:`, error);
            toast.error(`Failed to disconnect ${integrationId}`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-2xl border-border/50">
                <CardHeader className="text-center pb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">Step 3 of 4</span>
                    </div>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <span className="text-3xl">🔗</span>
                    </div>
                    <CardTitle className="text-2xl">Connect Your Tools</CardTitle>
                    <CardDescription className="text-base">
                        Connect Notion, Slack, or Jira to enhance your workflow (all optional)
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Integrations List */}
                    <div className="space-y-3">
                        {integrations.map((integration) => (
                            <div
                                key={integration.id}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    integration.connected
                                        ? "border-green-500/50 bg-green-500/5"
                                        : "border-border hover:border-border/80"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl",
                                                integration.color
                                            )}
                                        >
                                            {integration.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{integration.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {integration.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    {integration.connected ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle2Icon className="h-5 w-5" />
                                                <span className="text-sm font-medium">Connected</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnect(integration.id)}
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleConnect(integration.id)}
                                            disabled={integration.isConnecting}
                                        >
                                            {integration.isConnecting ? (
                                                <>
                                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                "Connect"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Info Note */}
                    <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Note:</strong> All integrations are optional. You can skip this step and connect tools later from the dashboard settings.
                        </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="space-y-3">
                        <Button className="w-full h-11" onClick={onComplete}>
                            {integrations.some((i) => i.connected)
                                ? "Continue to Setup"
                                : "Skip for Now"}
                            <ArrowRightIcon className="ml-2 h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={onBack}
                        >
                            <ChevronLeftIcon className="mr-2 h-4 w-4" />
                            Back to Preferences
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
