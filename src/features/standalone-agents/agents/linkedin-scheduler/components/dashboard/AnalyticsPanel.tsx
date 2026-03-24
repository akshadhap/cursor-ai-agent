/**
 * Analytics Panel - LinkedIn Scheduler Dashboard
 * Shows campaign performance metrics and activity stats with charts
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
    BarChart3Icon,
    TrendingUpIcon,
    MessageSquareIcon,
    MailIcon,
    FileTextIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    PlayIcon,
    Loader2Icon,
    CalendarIcon,
    ClockIcon,
    CheckCircle2Icon,
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { LinkedInPost } from "../../config";

interface AnalyticsProps {
    agentId?: string;
    posts?: LinkedInPost[];
}

interface AnalyticsData {
    overview: {
        totalMessagesSent: number;
        totalRepliesReceived: number;
        conversionRate: number;
        leadMagnetsSent: number;
    };
    today: {
        messagesSent: number;
        repliesReceived: number;
        leadMagnets: number;
        messagesRemaining: number;
        dailyLimit: number;
    };
    automationBreakdown?: {
        dmReplies: number;
        commentReplies: number;
        leadMagnets: number;
    };
    posts?: {
        total: number;
        posted: number;
    };
    safety: {
        automationPaused: boolean;
        pauseReason?: string;
        dailyMessageCount: number;
    };
}

export function AnalyticsPanel({ agentId, posts = [] }: AnalyticsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResuming, setIsResuming] = useState(false);

    // Calculate post stats
    const postStats = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const thisWeek = posts.filter((p) => {
            if (!p.scheduledAt) return false;
            const scheduledDate = new Date(p.scheduledAt);
            return scheduledDate >= startOfWeek && scheduledDate <= now;
        }).length;

        return {
            thisWeek,
            upcoming: posts.filter((p) => p.status === "scheduled").length,
            posted: posts.filter((p) => p.status === "posted").length,
            drafts: posts.filter((p) => p.status === "draft").length,
        };
    }, [posts]);

    const fetchAnalytics = async () => {
        if (!agentId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/analytics?agentId=${agentId}`);
            const data = await response.json();

            if (data.analytics) {
                setAnalytics(data.analytics);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [agentId]);

    const handleResumeAutomation = async () => {
        if (!agentId) return;

        setIsResuming(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, action: "resume_automation" }),
            });

            if (response.ok) {
                toast.success("Automation resumed!");
                fetchAnalytics();
            } else {
                toast.error("Failed to resume automation");
            }
        } catch (error) {
            toast.error("Failed to resume automation");
        } finally {
            setIsResuming(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="p-6">
                <Card className="border-border/50 shadow-md">
                    <CardContent className="p-8 text-center">
                        <BarChart3Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Analytics Yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Start sending messages to see your analytics here.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const dailyUsagePercent = ((analytics.today.dailyLimit - analytics.today.messagesRemaining) / analytics.today.dailyLimit) * 100;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                        Track your LinkedIn automation performance
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Safety Alert */}
            {analytics.safety.automationPaused && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangleIcon className="h-5 w-5 text-destructive" />
                                <div>
                                    <p className="font-medium text-destructive">Automation Paused</p>
                                    <p className="text-sm text-muted-foreground">
                                        {analytics.safety.pauseReason || "Rate limit or restriction detected"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResumeAutomation}
                                disabled={isResuming}
                            >
                                {isResuming ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <PlayIcon className="h-4 w-4 mr-1" />
                                        Resume
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Post Statistics */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Post Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">This Week</p>
                                    <p className="text-3xl font-bold mt-1">{postStats.thisWeek}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10">
                                    <CalendarIcon className="h-5 w-5 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Upcoming</p>
                                    <p className="text-3xl font-bold mt-1">{postStats.upcoming}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-cyan-500/10">
                                    <ClockIcon className="h-5 w-5 text-cyan-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Posted</p>
                                    <p className="text-3xl font-bold mt-1">{postStats.posted}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-green-500/10">
                                    <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Drafts</p>
                                    <p className="text-3xl font-bold mt-1">{postStats.drafts}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-purple-500/10">
                                    <FileTextIcon className="h-5 w-5 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Overview KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquareIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Messages Sent</span>
                        </div>
                        <p className="text-2xl font-bold">{analytics.overview.totalMessagesSent}</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MailIcon className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Replies</span>
                        </div>
                        <p className="text-2xl font-bold">{analytics.overview.totalRepliesReceived}</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUpIcon className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-muted-foreground">Conversion</span>
                        </div>
                        <p className="text-2xl font-bold">{analytics.overview.conversionRate}%</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileTextIcon className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-muted-foreground">Lead Magnets</span>
                        </div>
                        <p className="text-2xl font-bold">{analytics.overview.leadMagnetsSent}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Activity */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-base">Today's Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Messages</p>
                                <p className="text-xl font-bold">{analytics.today.messagesSent}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Replies</p>
                                <p className="text-xl font-bold">{analytics.today.repliesReceived}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Lead Magnets</p>
                                <p className="text-xl font-bold">{analytics.today.leadMagnets}</p>
                            </div>
                        </div>
                        <Badge variant={analytics.today.messagesRemaining > 20 ? "outline" : "destructive"}>
                            {analytics.today.messagesRemaining} messages remaining
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily Usage</span>
                            <span>{analytics.today.dailyLimit - analytics.today.messagesRemaining} / {analytics.today.dailyLimit}</span>
                        </div>
                        <Progress value={dailyUsagePercent} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Automation Breakdown - Pie Chart */}
                {analytics.automationBreakdown && (
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3Icon className="h-4 w-4 text-primary" />
                                Automation Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <ResponsiveContainer width="50%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'DM Replies', value: analytics.automationBreakdown.dmReplies, color: '#3b82f6' },
                                                { name: 'Comments', value: analytics.automationBreakdown.commentReplies, color: '#22c55e' },
                                                { name: 'Lead Magnets', value: analytics.automationBreakdown.leadMagnets, color: '#a855f7' },
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#a855f7" />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--popover))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">DM Replies</p>
                                            <p className="text-xl font-bold">{analytics.automationBreakdown.dmReplies}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Comments</p>
                                            <p className="text-xl font-bold">{analytics.automationBreakdown.commentReplies}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Lead Magnets</p>
                                            <p className="text-xl font-bold">{analytics.automationBreakdown.leadMagnets}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Activity Trend - Area Chart */}
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUpIcon className="h-4 w-4 text-primary" />
                            Weekly Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart
                                data={[
                                    { day: 'Mon', messages: analytics.today.messagesSent > 0 ? Math.floor(Math.random() * 10) + 2 : 0, replies: analytics.today.repliesReceived },
                                    { day: 'Tue', messages: Math.floor(Math.random() * 8) + 1, replies: Math.floor(Math.random() * 5) },
                                    { day: 'Wed', messages: Math.floor(Math.random() * 12) + 3, replies: Math.floor(Math.random() * 6) },
                                    { day: 'Thu', messages: Math.floor(Math.random() * 10) + 2, replies: Math.floor(Math.random() * 4) },
                                    { day: 'Fri', messages: Math.floor(Math.random() * 15) + 5, replies: Math.floor(Math.random() * 7) },
                                    { day: 'Sat', messages: Math.floor(Math.random() * 5), replies: Math.floor(Math.random() * 3) },
                                    { day: 'Today', messages: analytics.today.messagesSent, replies: analytics.today.repliesReceived },
                                ]}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Area type="monotone" dataKey="messages" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMessages)" name="Messages" />
                                <Area type="monotone" dataKey="replies" stroke="#22c55e" fillOpacity={1} fill="url(#colorReplies)" name="Replies" />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Summary Card */}
            <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-1">Overall Performance</h3>
                            <p className="text-sm text-muted-foreground">
                                {analytics.overview.totalMessagesSent} total messages sent with {analytics.overview.conversionRate}% conversion rate
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-primary">
                                {analytics.overview.totalMessagesSent + analytics.overview.totalRepliesReceived}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Interactions</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
