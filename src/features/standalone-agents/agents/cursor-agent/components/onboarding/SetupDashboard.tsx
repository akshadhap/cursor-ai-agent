import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2Icon,
    Settings,
    Chrome,
    Activity,
    Zap,
    ArrowRight
} from "lucide-react";

interface SetupDashboardProps {
    capabilities: Record<string, boolean>;
    onOpenDashboard: () => void;
    onManageCapabilities: () => void;
    onRebuildExtension: () => void;
}

export function SetupDashboard({
    capabilities,
    onOpenDashboard,
    onManageCapabilities,
    onRebuildExtension,
}: SetupDashboardProps) {
    const enabledCapabilities = Object.entries(capabilities).filter(([_, enabled]) => enabled);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Success Header */}
            <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center">
                    <CheckCircle2Icon className="w-10 h-10 text-green-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold">Setup Complete!</h2>
                    <p className="text-muted-foreground mt-2">
                        Your CursorAI agent is ready to use
                    </p>
                </div>
            </div>

            {/* Configuration Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Chrome className="w-4 h-4" />
                            Extension
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <Badge variant="default" className="bg-green-500">
                                <CheckCircle2Icon className="w-3 h-3 mr-1" />
                                Installed
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                                Chrome extension is ready
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Capabilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{enabledCapabilities.length}</div>
                            <p className="text-xs text-muted-foreground">
                                AI features enabled
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                                Agent is running
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Enabled Capabilities List */}
            <Card>
                <CardHeader>
                    <CardTitle>Enabled Capabilities</CardTitle>
                    <CardDescription>
                        These AI features are available in your extension
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {enabledCapabilities.map(([key, _]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                                <CheckCircle2Icon className="w-4 h-4 text-green-500" />
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Manage your CursorAI configuration
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={onManageCapabilities}
                    >
                        <span className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Manage Capabilities
                        </span>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={onRebuildExtension}
                    >
                        <span className="flex items-center gap-2">
                            <Chrome className="w-4 h-4" />
                            Rebuild Extension
                        </span>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>

            {/* CTA */}
            <div className="flex justify-center pt-4">
                <Button onClick={onOpenDashboard} size="lg" className="px-8">
                    Open Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
