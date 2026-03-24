import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    CheckCircle2Icon,
    ChevronLeft,
    MessageSquare,
    FileText,
    Lightbulb,
    ListTodo,
    Mail,
    Globe,
    Database,
    Activity,
    AlertCircle,
    Loader2Icon
} from "lucide-react";
import { toast } from "sonner";

interface ConfigureCapabilitiesStepProps {
    agentId: string;
    onComplete: () => void;
    onBack: () => void;
}

interface Capabilities {
    chat: boolean;
    summarize: boolean;
    explain: boolean;
    tasks: boolean;
    email: boolean;
    scraping: boolean;
    enrichment: boolean;
}

const CAPABILITIES = [
    {
        id: "chat" as keyof Capabilities,
        icon: MessageSquare,
        title: "Chat with AI",
        description: "Conversational AI with page context",
    },
    {
        id: "summarize" as keyof Capabilities,
        icon: FileText,
        title: "Summarize Text",
        description: "Condense long text into key points",
    },
    {
        id: "explain" as keyof Capabilities,
        icon: Lightbulb,
        title: "Explain Concepts",
        description: "Simplify complex topics",
    },
    {
        id: "tasks" as keyof Capabilities,
        icon: ListTodo,
        title: "Generate Tasks",
        description: "Convert text into structured tasks",
    },
    {
        id: "email" as keyof Capabilities,
        icon: Mail,
        title: "Draft Emails",
        description: "Auto-generate professional emails",
    },
    {
        id: "scraping" as keyof Capabilities,
        icon: Globe,
        title: "Web Scraping",
        description: "Extract and summarize web pages",
    },
    {
        id: "enrichment" as keyof Capabilities,
        icon: Database,
        title: "Data Enrichment",
        description: "Extract structured profile data",
    },
];

export function ConfigureCapabilitiesStep({ agentId, onComplete, onBack }: ConfigureCapabilitiesStepProps) {
    const [capabilities, setCapabilities] = useState<Capabilities>({
        chat: true,
        summarize: true,
        explain: true,
        tasks: true,
        email: true,
        scraping: true,
        enrichment: true,
    });
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
    const [isSaving, setIsSaving] = useState(false);

    const toggleCapability = (id: keyof Capabilities) => {
        setCapabilities((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const testConnection = async () => {
        setIsTestingConnection(true);
        setConnectionStatus("idle");

        try {
            const response = await fetch("http://localhost:3000/api/standalone-agents/cursor-agent/health");
            const data = await response.json();

            if (data.status === "ok") {
                setConnectionStatus("success");
                toast.success("Backend connection successful!");
            } else {
                setConnectionStatus("error");
                toast.error("Backend is not ready. Please check your setup.");
            }
        } catch (error) {
            setConnectionStatus("error");
            toast.error("Failed to connect to backend. Make sure the server is running.");
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        try {
            // Save capabilities to DB
            await fetch(`/api/standalone-agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: {
                        capabilities,
                        onboardingComplete: true,
                        completedAt: new Date().toISOString(),
                    },
                    status: "ACTIVE",
                }),
            });

            toast.success("Configuration saved!");
            onComplete();
        } catch (error) {
            console.error("Error saving configuration:", error);
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const enabledCount = Object.values(capabilities).filter(Boolean).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Configure Capabilities</h2>
                <p className="text-muted-foreground">
                    Choose which AI capabilities to enable in your extension
                </p>
            </div>

            {/* Connection Test */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Test Backend Connection
                    </CardTitle>
                    <CardDescription>
                        Verify that your extension can communicate with the backend
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Backend Status</p>
                            <p className="text-xs text-muted-foreground">
                                http://localhost:3000/api/standalone-agents/cursor-agent
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {connectionStatus === "success" && (
                                <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2Icon className="w-3 h-3 mr-1" />
                                    Connected
                                </Badge>
                            )}
                            {connectionStatus === "error" && (
                                <Badge variant="destructive">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Failed
                                </Badge>
                            )}
                            <Button
                                onClick={testConnection}
                                disabled={isTestingConnection}
                                variant="outline"
                            >
                                {isTestingConnection ? (
                                    <>
                                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </Button>
                        </div>
                    </div>

                    {connectionStatus === "error" && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>
                                Make sure your Next.js server is running with <code className="bg-muted px-1 py-0.5 rounded">npm run dev</code>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Capabilities Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>AI Capabilities</CardTitle>
                    <CardDescription>
                        {enabledCount} of {CAPABILITIES.length} capabilities enabled
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CAPABILITIES.map((capability) => {
                            const Icon = capability.icon;
                            const isEnabled = capabilities[capability.id];

                            return (
                                <div
                                    key={capability.id}
                                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${isEnabled ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-semibold text-sm">{capability.title}</h4>
                                            <Switch
                                                checked={isEnabled}
                                                onCheckedChange={() => toggleCapability(capability.id)}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {capability.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button
                    onClick={handleSave}
                    size="lg"
                    disabled={isSaving || enabledCount === 0}
                >
                    {isSaving ? (
                        <>
                            <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Complete Setup
                            <CheckCircle2Icon className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
