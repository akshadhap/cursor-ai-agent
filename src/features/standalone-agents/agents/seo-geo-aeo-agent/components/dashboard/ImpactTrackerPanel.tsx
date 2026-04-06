"use client";

import {
    TrendingUpIcon,
    DownloadIcon,
    CalendarIcon,
    LucideIcon,
    BrainCircuitIcon,
    CheckCircle2Icon,
    SparklesIcon,
    LineChartIcon,
    ArrowUpRightIcon,
    Globe2Icon,
    MessageSquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import type { VisibilityAnalysis, WebsiteProfile } from "../../config";

interface ImpactTrackerPanelProps {
    websiteProfile: WebsiteProfile;
    analysis: VisibilityAnalysis;
}

// Mocked historical data to show "Impact over time" for the demo
const mockGraphData = [
    { name: "Week 1", score: 62 },
    { name: "Week 2", score: 64 },
    { name: "Week 3", score: 68 },
    { name: "Week 4", score: 72 },   // Current score base
    { name: "Projected", score: 88 }, // Future projection
];

const completedTasks = [
    {
        title: "Established AI Brand Entity",
        description: "Created comprehensive GEO entity profile to ensure AI crawlers understand your brand offerings clearly.",
        icon: Globe2Icon,
        date: "2 Days Ago",
    },
    {
        title: "Resolved Critical Indexing Blocks",
        description: "Fixed essential structure issues that were preventing search engines from fully ranking your content.",
        icon: CheckCircle2Icon,
        date: "4 Days Ago",
    },
    {
        title: "Activated Advanced Answer Snippets",
        description: "Injected structured FAQ data to make your website eligible for direct voice and AI answers.",
        icon: MessageSquareIcon,
        date: "5 Days Ago",
    },
];

export function ImpactTrackerPanel({ websiteProfile, analysis }: ImpactTrackerPanelProps) {
    const activeScore = analysis.visibilityScore || 72;
    const projectedScore = Math.min(100, activeScore + 16);

    return (
        <div className="flex flex-col h-full bg-background relative z-0">
            {/* Header */}
            <div className="sticky top-0 z-10 flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex justify-between items-center p-6 pb-5">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <LineChartIcon className="h-6 w-6" />
                            Performance Impact
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tracking the ROI and unified growth of your digital presence.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Last 30 Days
                        </Button>
                        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                            <DownloadIcon className="h-4 w-4" />
                            Export Executive Report
                        </Button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[1200px] mx-auto space-y-8">

                    {/* Top Topline Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard 
                            title="Visibility Momentum"
                            value={`+${projectedScore - activeScore} Pts`}
                            subtitle="Projected growth after recent fixes"
                            trend="up"
                        />
                        <MetricCard 
                            title="Agent Actions Taken"
                            value="14"
                            subtitle="Automated optimizations this week"
                            icon={BrainCircuitIcon}
                        />
                        <MetricCard 
                            title="AI Readiness"
                            value="Strong"
                            subtitle="Entity presence in modern LLMs"
                            icon={SparklesIcon}
                        />
                    </div>

                    {/* Main Graph Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-base font-semibold text-foreground">Visibility Growth Trajectory</h3>
                                <p className="text-sm text-muted-foreground">Historical performance vs. projected impact of Agent changes.</p>
                            </div>
                            
                            <div className="flex-1 min-h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={mockGraphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis 
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="score" 
                                            stroke="#000000" 
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#fff' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Value Timeline */}
                        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
                            <div className="p-6 border-b border-border">
                                <h3 className="text-base font-semibold text-foreground">Value Delivered</h3>
                                <p className="text-sm text-muted-foreground">Recent automated improvements.</p>
                            </div>
                            
                            <div className="p-6 flex-1 space-y-6">
                                {completedTasks.map((task, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="mt-0.5 flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <task.icon className="w-4 h-4 text-foreground" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{task.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                {task.description}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-2">
                                                {task.date}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="p-4 border-t border-border bg-muted/20">
                                <Button variant="ghost" className="w-full text-xs gap-2">
                                    View Full History
                                    <ArrowUpRightIcon className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>

                    </div>

                    {/* How It All Connects */}
                    <div>
                        <h3 className="text-lg font-bold text-foreground mb-4">The Unified Strategy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StrategyCard 
                                step="1"
                                title="Traditional Foundation"
                                desc="Resolving core structural barriers so standard search engines can read and index your site flawlessly."
                            />
                            <StrategyCard 
                                step="2"
                                title="Entity Recognition"
                                desc="Packaging your brand into structured data entities so AI systems understand who you are and what you offer."
                            />
                            <StrategyCard 
                                step="3"
                                title="Direct Answer Delivery"
                                desc="Structuring your content specifically to be the direct response when users ask voice assistants or AI chats."
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, trend, icon: Icon }: { title: string, value: string, subtitle: string, trend?: 'up' | 'down', icon?: LucideIcon }) {
    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                {Icon ? (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                ) : trend === 'up' ? (
                    <TrendingUpIcon className="h-4 w-4 text-foreground" />
                ) : null}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        </div>
    );
}

function StrategyCard({ step, title, desc }: { step: string, title: string, desc: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-foreground/30 transition-colors">
            <div className="text-4xl font-black text-muted/30 absolute -top-2 -right-1 z-0 group-hover:text-muted/50 transition-colors">
                {step}
            </div>
            <div className="relative z-10">
                <h4 className="font-semibold text-foreground">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {desc}
                </p>
            </div>
        </div>
    );
}
