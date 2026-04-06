/**
 * Enhanced Cursor Agent Dashboard
 * Tabs: Overview | Activity | Settings | Extension
 * Based on LinkedIn agent structure with activity tracking
 */

"use client";

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
    ListTodo,
    Mail,
    Globe,
    Database,
    Download,
    ExternalLink,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { ActivityFilters, type ActivityFilters as Filters } from "./ActivityFilters";
import { exportActivityToCSV, exportAnalyticsToCSV } from "../../lib/export-csv";

interface EnhancedCursorAgentDashboardProps {
    agentId: string;
    capabilities: Record<string, boolean>;
    onOpenSettings: () => void;
}

interface ConnectionStatus {
    status: "checking" | "connected" | "disconnected";
    message?: string;
}

interface ActivityItem {
    id: string;
    type: "chat" | "summarize" | "explain" | "task" | "email" | "scrape" | "enrich";
    details: any;
    url?: string;
    timestamp: string;
}

interface Analytics {
    totalActions: number;
    actionsByType: Record<string, number>;
    dailyUsage: Record<string, number>;
    lastActive: string | null;
}

const CAPABILITY_ICONS: Record<string, any> = {
    chat: MessageSquare,
    summarize: FileText,
    explain: FileText,
    task: ListTodo,
    email: Mail,
    scrape: Globe,
    enrich: Database,
};

const ACTION_TYPE_LABELS: Record<string, string> = {
    chat: "Chat",
    summarize: "Summarize",
    explain: "Explain",
    task: "Generate Task",
    email: "Draft Email",
    scrape: "Web Scrape",
    enrich: "Data Enrichment",
};

const CONNECTION_MESSAGES = {
    connected: "Backend is online and ready",
    disconnected: "Unable to connect to backend. Please ensure your Next.js server is running.",
    checking: "Checking connection status...",
};

// Helper function to handle API errors
function handleAPIError(response: Response): string {
    if (response.status === 404) {
        return "Resource not found. Please check your configuration.";
    } else if (response.status === 401) {
        return "Unauthorized. Please log in again.";
    } else if (response.status === 403) {
        return "Access denied. You don't have permission to access this resource.";
    } else if (response.status === 500) {
        return "Server error. Please try again later.";
    } else {
        return "Failed to load data. Please try again.";
    }
}

// Helper function to get friendly error message
function getFriendlyErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes("fetch")) {
            return "Network error. Please check your internet connection.";
        }
        // Return a generic message (hide technical details from users)
        return "An error occurred while loading data. Please try again.";
    }
    return "An unexpected error occurred. Please try again.";
}

export function EnhancedCursorAgentDashboard({
    agentId,
    capabilities,
    onOpenSettings,
}: EnhancedCursorAgentDashboardProps) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        status: "checking",
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [analytics, setAnalytics] = useState<Analytics>({
        totalActions: 0,
        actionsByType: {},
        dailyUsage: {},
        lastActive: null,
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [activityFilters, setActivityFilters] = useState<Filters>({
        search: "",
        type: "",
        dateFrom: undefined,
        dateTo: undefined,
    });
    const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);

    const checkConnection = async () => {
        setConnectionStatus({ status: "checking" });

        try {
            const response = await fetch("/api/standalone-agents/cursor-agent/health");
            const data = await response.json();

            if (data.status === "ok") {
                setConnectionStatus({
                    status: "connected",
                    message: CONNECTION_MESSAGES.connected,
                });
            } else {
                setConnectionStatus({
                    status: "disconnected",
                    message: CONNECTION_MESSAGES.disconnected,
                });
            }
        } catch (error) {
            // User-friendly message, detailed error logged internally
            setConnectionStatus({
                status: "disconnected",
                message: CONNECTION_MESSAGES.disconnected,
            });
            if (process.env.NODE_ENV === "development") {
                console.error("[Connection Check Failed]:", error);
            }
        }
    };

    const loadActivityAndAnalytics = async () => {
        try {
            // Fetch activity
            const activityResponse = await fetch(
                `/api/standalone-agents/cursor-agent/activity?agentId=${agentId}&limit=50`
            );
            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                setActivities(activityData.activities || []);
            } else {
                // Show friendly message for API errors
                const errorMsg = handleAPIError(activityResponse);
                toast.error(errorMsg);
            }

            // Fetch analytics
            const analyticsResponse = await fetch(
                `/api/standalone-agents/cursor-agent/analytics?agentId=${agentId}`
            );
            if (analyticsResponse.ok) {
                const analyticsData = await analyticsResponse.json();
                setAnalytics(analyticsData.analytics || {});
            } else {
                const errorMsg = handleAPIError(analyticsResponse);
                toast.error(errorMsg);
            }
        } catch (error) {
            // Show user-friendly error, log details for developers
            const friendlyMessage = getFriendlyErrorMessage(error);
            toast.error(friendlyMessage);
            if (process.env.NODE_ENV === "development") {
                console.error("[Data Loading Error]:", error);
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    // Filter activities based on filters
    useEffect(() => {
        let filtered = [...activities];

        // Search filter
        if (activityFilters.search) {
            const searchLower = activityFilters.search.toLowerCase();
            filtered = filtered.filter(
                (a) =>
                    a.type.toLowerCase().includes(searchLower) ||
                    JSON.stringify(a.details).toLowerCase().includes(searchLower) ||
                    a.url?.toLowerCase().includes(searchLower)
            );
        }

        // Type filter
        if (activityFilters.type) {
            filtered = filtered.filter((a) => a.type === activityFilters.type);
        }

        // Date range filter
        if (activityFilters.dateFrom) {
            filtered = filtered.filter(
                (a) => new Date(a.timestamp) >= activityFilters.dateFrom!
            );
        }

        if (activityFilters.dateTo) {
            const dateTo = new Date(activityFilters.dateTo);
            dateTo.setHours(23, 59, 59, 999); // Include entire day
            filtered = filtered.filter((a) => new Date(a.timestamp) <= dateTo);
        }

        setFilteredActivities(filtered);
    }, [activities, activityFilters]);

    useEffect(() => {
        checkConnection();
        loadActivityAndAnalytics();

        // Refresh data every 30 seconds
        const interval = setInterval(() => {
            checkConnection();
            loadActivityAndAnalytics();
        }, 30000);

        return () => clearInterval(interval);
    }, [agentId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([checkConnection(), loadActivityAndAnalytics()]);
        toast.success("Data refreshed");
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleExportExtension = async () => {
        try {
            toast.info("Generating extension package...");

            // Trigger download
            const downloadUrl = `/api/standalone-agents/cursor-agent/download?agentId=${agentId}`;

            // Create invisible link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `cursor-ai-extension-${agentId}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Extension package downloaded!");
        } catch (error) {
            console.error("Error exporting extension:", error);
            toast.error("Failed to export extension");
        }
    };

    const handleExportActivityCSV = () => {
        try {
            exportActivityToCSV(
                filteredActivities.length > 0 ? filteredActivities : activities,
                `cursor-ai-activity-${new Date().toISOString().split("T")[0]}.csv`
            );
            toast.success("Activity log exported to CSV!");
        } catch (error: any) {
            toast.error(error.message || "Failed to export activity");
        }
    };

    const handleExportAnalyticsCSV = () => {
        try {
            exportAnalyticsToCSV(
                analytics,
                `cursor-ai-analytics-${new Date().toISOString().split("T")[0]}.csv`
            );
            toast.success("Analytics exported to CSV!");
        } catch (error: any) {
            toast.error(error.message || "Failed to export analytics");
        }
    };

    const enabledCapabilities = Object.entries(capabilities)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Connection Status */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Connection
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
                                            Offline
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Actions */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Total Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.totalActions}</div>
                                <p className="text-xs text-muted-foreground">All time</p>
                            </CardContent>
                        </Card>

                        {/* Active Capabilities */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Capabilities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{enabledCapabilities.length}</div>
                                <p className="text-xs text-muted-foreground">AI features enabled</p>
                            </CardContent>
                        </Card>

                        {/* Last Active */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Last Active
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm">
                                    {analytics.lastActive
                                        ? new Date(analytics.lastActive).toLocaleDateString()
                                        : "Never"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {analytics.lastActive
                                        ? new Date(analytics.lastActive).toLocaleTimeString()
                                        : "No activity yet"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Disconnection Alert */}
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
                            <TabsTrigger value="activity">
                                Activity
                                {activities.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {activities.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                            <TabsTrigger value="extension">Extension</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Stats</CardTitle>
                                    <CardDescription>Your cursor AI usage at a glance</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(analytics.actionsByType || {}).map(([type, count]) => {
                                            const Icon = CAPABILITY_ICONS[type] || Activity;
                                            return (
                                                <div
                                                    key={type}
                                                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Icon className="w-4 h-4 text-primary" />
                                                        <span className="text-sm font-medium">{ACTION_TYPE_LABELS[type] || type}</span>
                                                    </div>
                                                    <div className="text-2xl font-bold">{count}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {Object.keys(analytics.actionsByType || {}).length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No activity yet. Start using your extension!</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Analytics Charts */}
                            <AnalyticsCharts
                                actionsByType={analytics.actionsByType}
                                dailyUsage={analytics.dailyUsage}
                            />

                            {/* Export Analytics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Export Analytics</span>
                                        <Button
                                            onClick={handleExportAnalyticsCSV}
                                            variant="outline"
                                            size="sm"
                                            disabled={analytics.totalActions === 0}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download CSV
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>How to Use</CardTitle>
                                    <CardDescription>Get started in 3 simple steps</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <UsageStep
                                        number={1}
                                        title="Select Text"
                                        description="Highlight any text on a webpage"
                                    />
                                    <UsageStep
                                        number={2}
                                        title="Choose Action"
                                        description="Click the cursor bubble and select an AI action"
                                    />
                                    <UsageStep
                                        number={3}
                                        title="Get Results"
                                        description="View AI-generated results instantly"
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Activity Tab */}
                        <TabsContent value="activity" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Activity className="w-5 h-5" />
                                                Recent Activity
                                            </CardTitle>
                                            <CardDescription>
                                                All your cursor AI actions tracked in real-time
                                            </CardDescription>
                                        </div>
                                        <Button
                                            onClick={handleExportActivityCSV}
                                            variant="outline"
                                            size="sm"
                                            disabled={activities.length === 0}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Activity Filters */}
                                    <ActivityFilters onFilterChange={setActivityFilters} />

                                    {/* Display filtered count */}
                                    {activities.length > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            Showing {filteredActivities.length} of {activities.length} activities
                                        </div>
                                    )}

                                    {/* Activity Table */}
                                    {isLoadingData ? (
                                        <div className="text-center py-8">
                                            <Loader2Icon className="w-8 h-8 mx-auto animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground mt-2">Loading activity...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>No activity yet</p>
                                            <p className="text-sm mt-1">
                                                actions performed with your extension will appear here
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Action</TableHead>
                                                        <TableHead>Details</TableHead>
                                                        <TableHead>Website</TableHead>
                                                        <TableHead>Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredActivities.slice(0, 50).map((activity) => {
                                                        const Icon = CAPABILITY_ICONS[activity.type] || Activity;
                                                        return (
                                                            <TableRow key={activity.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon className="w-4 h-4 text-primary" />
                                                                        <span className="font-medium">
                                                                            {ACTION_TYPE_LABELS[activity.type] || activity.type}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="max-w-xs truncate">
                                                                    {typeof activity.details === "string"
                                                                        ? activity.details
                                                                        : JSON.stringify(activity.details).slice(0, 50) + "..."}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {activity.url ? (
                                                                        <Link
                                                                            href={activity.url}
                                                                            target="_blank"
                                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                        >
                                                                            View
                                                                            <ExternalLink className="w-3 h-3" />
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">N/A</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">
                                                                    {new Date(activity.timestamp).toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Preferences</CardTitle>
                                    <CardDescription>Manage your cursor AI settings</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={onOpenSettings}>Open Settings</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Extension Tab */}
                        <TabsContent value="extension" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Chrome className="w-5 h-5" />
                                        Chrome Extension
                                    </CardTitle>
                                    <CardDescription>Download and install the cursor AI extension</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 rounded-lg border-2 border-dashed border-border">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">Download Extension</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Get your personalized extension package
                                                </p>
                                            </div>
                                            <Button onClick={handleExportExtension}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Export
                                            </Button>
                                        </div>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Installation Guide</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ol className="space-y-2 text-sm">
                                                <li className="flex items-start gap-2">
                                                    <span className="font-bold">1.</span>
                                                    Download the extension using the button above
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="font-bold">2.</span>
                                                    Extract the ZIP file to a folder on your computer
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="font-bold">3.</span>
                                                    Open Chrome and navigate to{" "}
                                                    <code className="bg-muted px-1 py-0.5 rounded">chrome://extensions/</code>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="font-bold">4.</span>
                                                    Enable "Developer mode" in the top-right corner
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="font-bold">5.</span>
                                                    Click "Load unpacked" and select the extracted folder
                                                </li>
                                            </ol>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function UsageStep({
    number,
    title,
    description,
}: {
    number: number;
    title: string;
    description: string;
}) {
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
