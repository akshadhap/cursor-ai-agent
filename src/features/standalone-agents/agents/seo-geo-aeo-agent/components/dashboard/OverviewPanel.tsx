/**
 * VisibilityAI — Overview Panel
 * Fully monochrome: black/white only — no green/amber/red/blue anywhere
 * Premium Next-Level Aesthetics
 */

"use client";

import {
    TrendingUpIcon,
    ZapIcon,
    GlobeIcon,
    MessageSquareIcon,
    AlertTriangleIcon,
    CheckCircle2Icon,
    ArrowRightIcon,
    SparklesIcon,
    RefreshCwIcon,
    ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import type { VisibilityAnalysis, WebsiteProfile, NavItemId } from "../../config";

interface OverviewPanelProps {
    analysis: VisibilityAnalysis;
    websiteProfile: WebsiteProfile;
    isAnalyzing: boolean;
    onRunAnalysis: () => void;
    onNavigate: (tab: NavItemId) => void;
}

/** Premium Monochrome Donut Chart using Recharts */
function ScoreRing({ score, size = 120, showLabel = true, label = "" }: { score: number; size?: number; showLabel?: boolean; label?: string }) {
    const data = [
        { name: "Score", value: score },
        { name: "Gap", value: 100 - score }
    ];

    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            startAngle={90}
                            endAngle={-270}
                            innerRadius={size * 0.35}
                            outerRadius={size * 0.45}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill="hsl(var(--foreground))" />
                            <Cell fill="hsl(var(--muted))" opacity={0.3} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("font-black tracking-tighter text-foreground", size >= 150 ? "text-3xl" : "text-xl")}>{score}</span>
                    {size >= 120 && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">/ 100</span>}
                </div>
            </div>
            {showLabel && label && (
                <div className="mt-4 text-center">
                    <p className="text-sm font-bold tracking-wide text-foreground">{label}</p>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ score }: { score: number }) {
    const label =
        score >= 80 ? "Elite" :
        score >= 60 ? "Solid" :
        score >= 40 ? "Needs Polish" : "Critical Warning";
        
    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            score >= 60 ? "bg-foreground text-background border-foreground" : 
                          "bg-transparent text-muted-foreground border-border"
        )}>
            {label}
        </span>
    );
}

export function OverviewPanel({
    analysis,
    websiteProfile,
    isAnalyzing,
    onRunAnalysis,
    onNavigate,
}: OverviewPanelProps) {
    const seoIssues     = analysis.seoIssues || [];
    const criticalIssues = seoIssues.filter(i => i.severity === "critical").length;
    const warnings       = seoIssues.filter(i => i.severity === "warning").length;
    const quickWins      = analysis.quickWins || [];

    const subScores = [
        { label: "SEO Score", score: analysis.seoScore, icon: TrendingUpIcon,    tab: "seo-audit"    as NavItemId, desc: "Technical ranking" },
        { label: "GEO Score", score: analysis.geoScore, icon: GlobeIcon,         tab: "geo-analysis" as NavItemId, desc: "AI optimization" },
        { label: "AEO Score", score: analysis.aeoScore, icon: MessageSquareIcon, tab: "aeo-generator"as NavItemId, desc: "Answer extraction" },
    ];

    const chartData = [
        { name: "SEO Optimization", score: analysis.seoScore },
        { name: "GEO Optimization", score: analysis.geoScore },
        { name: "AEO Optimization", score: analysis.aeoScore },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Elegant Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-border/40">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border/50 text-xs font-medium text-muted-foreground mb-4">
                        <ActivityIcon className="h-3 w-3" /> System Nominal
                    </div>
                    <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        Visibility Intelligence
                    </h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Targeting <span className="font-mono font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded">{websiteProfile.domain}</span> 
                        &middot; {new Date(analysis.generatedAt).toLocaleDateString()}
                    </p>
                </div>
                
                <Button
                    onClick={onRunAnalysis}
                    disabled={isAnalyzing}
                    size="lg"
                    className="gap-2 shrink-0 rounded-full font-bold shadow-sm"
                >
                    <RefreshCwIcon className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                    {isAnalyzing ? "Executing Deep Scan..." : "Execute Deep Scan"}
                </Button>
            </div>

            {/* Top Scores Multi-Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Master Visibility Ring (Hero) */}
                <Card className="lg:col-span-5 bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-foreground/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-foreground/10 duration-700" />
                    <CardContent className="p-8 h-full flex flex-col items-center justify-center relative z-10">
                        <div className="w-full flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold tracking-tight">System Visibility</h3>
                            <StatusBadge score={analysis.visibilityScore} />
                        </div>
                        <div className="flex-1 flex items-center justify-center transform transition-transform group-hover:scale-105 duration-500">
                            <ScoreRing score={analysis.visibilityScore} size={180} strokeWidth={12} showLabel={false} />
                        </div>
                        <p className="text-sm text-muted-foreground text-center mt-6 max-w-[250px]">
                            Aggregated metrics combining traditional search indexation with LLM entity presence.
                        </p>
                    </CardContent>
                </Card>

                {/* Sub Scores Grid */}
                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {subScores.map(sub => (
                        <Card
                            key={sub.label}
                            className="group relative cursor-pointer border-border/50 bg-card hover:bg-muted/10 transition-all duration-300 hover:shadow-md overflow-hidden"
                            onClick={() => onNavigate(sub.tab)}
                        >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center shadow-sm">
                                        <sub.icon className="h-5 w-5" />
                                    </div>
                                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground transform group-hover:translate-x-1 transition-transform" />
                                </div>
                                
                                <div className="flex items-center justify-center mb-6">
                                    <ScoreRing score={sub.score} size={84} strokeWidth={6} showLabel={false} />
                                </div>

                                <div className="text-center space-y-1">
                                    <p className="font-bold tracking-tight">{sub.label}</p>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{sub.desc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Lower Sector: Analytics & Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* Advanced Bar Chart */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUpIcon className="h-4 w-4 text-foreground" />
                            Optimization Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fontWeight: 500, fill: "hsl(var(--muted-foreground))" }} 
                                    dy={10} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                                    domain={[0, 100]} 
                                />
                                <Tooltip
                                    cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
                                    contentStyle={{ 
                                        backgroundColor: "hsl(var(--background))", 
                                        borderRadius: "12px", 
                                        border: "1px solid hsl(var(--border))", 
                                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" 
                                    }}
                                    itemStyle={{ color: "hsl(var(--foreground))", fontSize: "14px", fontWeight: "bold" }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="score" 
                                    stroke="hsl(var(--foreground))" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorScore)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Diagnostics Column */}
                <div className="flex flex-col gap-6">
                    {/* Compact Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Volumes", val: analysis.pagesAnalyzed, i: GlobeIcon },
                            { label: "Bugs", val: analysis.issuesFound, i: AlertTriangleIcon },
                            { label: "Threats", val: criticalIssues, i: AlertTriangleIcon, alert: true },
                            { label: "Alerts", val: warnings, i: CheckCircle2Icon },
                        ].map(stat => (
                            <div key={stat.label} className="p-4 rounded-xl border border-border/50 bg-card shadow-sm flex flex-col justify-between">
                                <stat.i className={cn("h-4 w-4 mb-3", stat.alert && stat.val > 0 ? "text-destructive" : "text-muted-foreground")} />
                                <div>
                                    <p className="text-2xl font-black">{stat.val}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Wins Card */}
                    <Card className="flex-1 border-border/50 shadow-sm overflow-hidden flex flex-col">
                        <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4 text-foreground" />
                                Actionable Intel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            <div className="space-y-3">
                                {quickWins.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 text-muted-foreground">
                                        <CheckCircle2Icon className="h-8 w-8 opacity-20" />
                                        <p className="text-sm font-medium">System optimal. No intel present.</p>
                                    </div>
                                ) : (
                                    quickWins.slice(0, 4).map((win, idx) => (
                                        <div key={idx} className="group flex items-start gap-3 p-3 rounded-lg overflow-hidden relative isolate">
                                            <div className="absolute inset-0 bg-muted/40 transform scale-95 group-hover:scale-100 transition-transform -z-10 rounded-lg" />
                                            <div className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground group-hover:text-foreground group-hover:border-foreground transition-colors mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">{win}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Global Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
                <Button variant="secondary" className="gap-2 h-12 text-sm font-bold shadow-sm rounded-xl" onClick={() => onNavigate("seo-boost")}>
                    <ZapIcon className="h-4 w-4" /> Resolve SEO Issues
                </Button>
                <Button variant="secondary" className="gap-2 h-12 text-sm font-bold shadow-sm rounded-xl" onClick={() => onNavigate("geo-boost")}>
                    <GlobeIcon className="h-4 w-4" /> Synthesize GEO Knowledge
                </Button>
                <Button variant="secondary" className="gap-2 h-12 text-sm font-bold shadow-sm rounded-xl hover:bg-foreground hover:text-background transition-all" onClick={() => onNavigate("aeo-generator")}>
                    <MessageSquareIcon className="h-4 w-4" /> Formulate AEO Schemas
                </Button>
            </div>
        </div>
    );
}
