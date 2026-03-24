import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Activity,
    Settings,
    BarChart3,
    Chrome,
    RefreshCw,
    CheckCircle2Icon,
    XCircle,
    Loader2Icon,
    AlertCircle,
    Zap,
    MessageSquare,
    FileText,
    Lightbulb,
    ListTodo,
    Mail,
    Globe,
    Database
} from "lucide-react";
import { toast } from "sonner";

interface CursorAgentDashboardProps {
    agentId: string;
    capabilities: Record<string, boolean>;
    onOpenSettings: () => void;
}

interface ConnectionStatus {
    status: "checking" | "connected" | "disconnected";
    message?: string;
}

const CAPABILITY_ICONS: Record<string, any> = {
    chat: MessageSquare,
    ask_ai: MessageSquare,
    tasks: ListTodo,
    email: Mail,
    scraping: Globe,
    enrichment: Database,
};

export function CursorAgentDashboard({
    agentId,
    capabilities,
    onOpenSettings,
}: CursorAgentDashboardProps) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        status: "checking",
    });
    const [isRefreshing, setIsRefreshing] = useState(false);

    const checkConnection = async () => {
        setConnectionStatus({ status: "checking" });

        try {
            const response = await fetch("http://localhost:3000/api/standalone-agents/cursor-agent/health");
            const data = await response.json();

            if (data.status === "ok") {
                setConnectionStatus({
                    status: "connected",
                    message: "Backend is healthy and ready",
                });
            } else {
                setConnectionStatus({
                    status: "disconnected",
                    message: data.message || "Backend is not ready",
                });
            }
        } catch (error) {
            setConnectionStatus({
                status: "disconnected",
                message: "Failed to connect to backend",
            });
        }
    };

    useEffect(() => {
        checkConnection();
        // Check connection every 30 seconds
        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await checkConnection();
        toast.success("Status refreshed");
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const enabledCapabilities = Array.from(new Set(
        Object.entries(capabilities)
            .filter(([key, enabled]) => enabled && key !== 'explain')
            .map(([key]) => {
                if (key === 'summarize') return 'ask_ai';
                return key;
            })
    ));

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">CursorAI Dashboard</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Monitor and manage your AI cursor assistant
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={onOpenSettings}>
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <div className="px-6 py-6 space-y-6">
                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Connection Status */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Connection Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {connectionStatus.status === "checking" && (
                                        <Badge variant="secondary">
                                            <Loader2Icon className="w-3 h-3 mr-1 animate-spin" />
                                            Checking...
                                        </Badge>
                                    )}
                                    {connectionStatus.status === "connected" && (
                                        <Badge variant="default" className="bg-green-500">
                                            <CheckCircle2Icon className="w-3 h-3 mr-1" />
                                            Connected
                                        </Badge>
                                    )}
                                    {connectionStatus.status === "disconnected" && (
                                        <Badge variant="destructive">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Disconnected
                                        </Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {connectionStatus.message || "Checking backend..."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Extension Status */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Chrome className="w-4 h-4" />
                                    Extension
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Badge variant="default" className="bg-green-500">
                                        <CheckCircle2Icon className="w-3 h-3 mr-1" />
                                        Installed
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                        Chrome extension is active
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Capabilities */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Active Capabilities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold">{enabledCapabilities.length}</div>
                                    <p className="text-xs text-muted-foreground">
                                        AI features enabled
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Connection Alert */}
                    {connectionStatus.status === "disconnected" && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>
                                <strong>Backend Offline:</strong> Make sure your Next.js server is running with{" "}
                                <code className="bg-muted px-1 py-0.5 rounded">npm run dev</code>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                            <TabsTrigger value="usage">Usage</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>How to Use</CardTitle>
                                    <CardDescription>
                                        Get started with CursorAI in 3 simple steps
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <UsageStep
                                        number={1}
                                        title="Select Text"
                                        description="Highlight any text on a webpage (minimum 2 characters)"
                                    />
                                    <UsageStep
                                        number={2}
                                        title="Choose Action"
                                        description="Click the quick menu that appears and select an AI action"
                                    />
                                    <UsageStep
                                        number={3}
                                        title="Get Results"
                                        description="View AI-generated results in the side panel"
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Keyboard Shortcuts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Toggle Side Panel</span>
                                            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt + S</kbd>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Capabilities Tab */}
                        <TabsContent value="capabilities" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Enabled Capabilities</CardTitle>
                                    <CardDescription>
                                        {enabledCapabilities.length} AI features are currently active
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {enabledCapabilities.map((key) => {
                                            const Icon = CAPABILITY_ICONS[key] || Zap;
                                            return (
                                                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium capitalize">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Usage Tab */}
                        <TabsContent value="usage" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5" />
                                        Usage Statistics
                                    </CardTitle>
                                    <CardDescription>
                                        Track your AI usage and activity
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-12 text-muted-foreground">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Usage statistics will appear here once you start using the extension</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function UsageStep({ number, title, description }: { number: number; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                {number}
            </div>
            <div>
                <h4 className="font-semibold text-sm">{title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>
    );
}
