"use client";

import { useState, useEffect } from "react";
import {
    Activity,
    Plug,
    Unplug,
    ClipboardList,
    FileText,
    PlusCircle,
    Edit,
    Trash2,
    Play,
    Brain,
    RefreshCw,
    Tag,
    Zap,
    Filter,
    ChevronDown,
    Clock,
    CheckCircle,
    XCircle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityLog, ActivityType, formatActivityTime, getActivityColor } from "@/lib/activity-history";

interface ActivityHistoryProps {
    agentId: string;
    className?: string;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
    connection: <Plug className="w-3.5 h-3.5" />,
    disconnection: <Unplug className="w-3.5 h-3.5" />,
    jira_task: <ClipboardList className="w-3.5 h-3.5" />,
    notion_page: <FileText className="w-3.5 h-3.5" />,
    rule_created: <PlusCircle className="w-3.5 h-3.5" />,
    rule_updated: <Edit className="w-3.5 h-3.5" />,
    rule_deleted: <Trash2 className="w-3.5 h-3.5" />,
    rule_executed: <Play className="w-3.5 h-3.5" />,
    knowledge_added: <Brain className="w-3.5 h-3.5" />,
    knowledge_deleted: <Brain className="w-3.5 h-3.5" />,
    email_sync: <RefreshCw className="w-3.5 h-3.5" />,
    email_classified: <Tag className="w-3.5 h-3.5" />,
    automation: <Zap className="w-3.5 h-3.5" />,
};

const FILTER_OPTIONS: { value: ActivityType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Activity' },
    { value: 'connection', label: 'Connections' },
    { value: 'jira_task', label: 'Jira Tasks' },
    { value: 'notion_page', label: 'Notion Pages' },
    { value: 'rule_executed', label: 'Rule Executions' },
    { value: 'email_sync', label: 'Email Syncs' },
    { value: 'knowledge_added', label: 'Knowledge Base' },
];

export function ActivityHistory({ agentId, className }: ActivityHistoryProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<ActivityType | 'all'>('all');

    // Fetch activity logs
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const url = filter === 'all'
                    ? `/api/standalone-agents/gmail-classifier/activity?agentId=${agentId}`
                    : `/api/standalone-agents/gmail-classifier/activity?agentId=${agentId}&type=${filter}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    setLogs(data.logs || []);
                }
            } catch (error) {
                console.error('[ActivityHistory] Error fetching logs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();

        // Refresh every 30 seconds
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, [agentId, filter]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-3 h-3 text-emerald-500" />;
            case 'failed':
                return <XCircle className="w-3 h-3 text-red-500" />;
            case 'pending':
                return <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-12", className)}>
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">Loading activity...</p>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Activity History</h3>
                    <Badge variant="secondary" className="text-[10px] h-5">{logs.length}</Badge>
                </div>

                {/* Filter Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <Filter className="w-3 h-3" />
                            {FILTER_OPTIONS.find(f => f.value === filter)?.label || 'All'}
                            <ChevronDown className="w-3 h-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs">Filter by Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {FILTER_OPTIONS.map(option => (
                            <DropdownMenuItem
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={cn("text-xs", filter === option.value && "bg-accent")}
                            >
                                {option.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-auto">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Activity className="w-8 h-8 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Actions like syncing emails, creating Jira tasks, and connecting tools will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="px-4 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className={cn(
                                        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted",
                                        getActivityColor(log.type)
                                    )}>
                                        {ACTIVITY_ICONS[log.type] || <Activity className="w-3.5 h-3.5" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {log.action}
                                            </p>
                                            {getStatusIcon(log.status)}
                                        </div>
                                        {log.details && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {log.details}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatActivityTime(log.timestamp)}
                                            </span>
                                            {log.metadata?.tool && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                                                    {log.metadata.tool}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
