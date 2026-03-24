/**
 * VisibilityAI — Overview Panel
 * Visibility score ring, summary cards, quick wins
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VisibilityAnalysis, WebsiteProfile, NavItemId } from "../../config";

interface OverviewPanelProps {
    analysis: VisibilityAnalysis;
    websiteProfile: WebsiteProfile;
    isAnalyzing: boolean;
    onRunAnalysis: () => void;
    onNavigate: (tab: NavItemId) => void;
}

function ScoreRing({ score, size = 120, color = "#8b5cf6" }: { score: number; size?: number; color?: string }) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const center = size / 2;

    const getColor = (s: number) => {
        if (s >= 75) return "#22c55e";
        if (s >= 50) return "#f59e0b";
        return "#ef4444";
    };

    const ringColor = getColor(score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: ringColor }}>{score}</span>
                <span className="text-xs text-muted-foreground">/100</span>
            </div>
        </div>
    );
}

export function OverviewPanel({
    analysis,
    websiteProfile,
    isAnalyzing,
    onRunAnalysis,
    onNavigate,
}: OverviewPanelProps) {
    const getScoreLabel = (s: number) => {
        if (s >= 80) return { label: "Excellent", color: "text-green-500" };
        if (s >= 60) return { label: "Good", color: "text-yellow-500" };
        if (s >= 40) return { label: "Needs Work", color: "text-orange-500" };
        return { label: "Critical", color: "text-red-500" };
    };

    const overall = getScoreLabel(analysis.visibilityScore);

    const subScores = [
        {
            label: "SEO Score",
            score: analysis.seoScore,
            icon: TrendingUpIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            tab: "seo-audit" as NavItemId,
            desc: "Search engine ranking",
        },
        {
            label: "GEO Score",
            score: analysis.geoScore,
            icon: GlobeIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            tab: "geo-analysis" as NavItemId,
            desc: "AI engine presence",
        },
        {
            label: "AEO Score",
            score: analysis.aeoScore,
            icon: MessageSquareIcon,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            tab: "aeo-generator" as NavItemId,
            desc: "Answer engine wins",
        },
    ];

    const criticalIssues = analysis.seoIssues.filter(i => i.severity === "critical").length;
    const warnings = analysis.seoIssues.filter(i => i.severity === "warning").length;

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Visibility Overview</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Last analyzed: {new Date(analysis.generatedAt).toLocaleString()} ·{" "}
                        <span className="font-mono">{websiteProfile.domain}</span>
                    </p>
                </div>
                <Button
                    onClick={onRunAnalysis}
                    disabled={isAnalyzing}
                    size="sm"
                    className="gap-2"
                >
                    <RefreshCwIcon className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                    {isAnalyzing ? "Analyzing..." : "Re-Analyze"}
                </Button>
            </div>

            {/* Main Score + Sub Scores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Big score ring */}
                <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6 col-span-1">
                    <div className="text-center space-y-2">
                        <ScoreRing score={analysis.visibilityScore} size={130} />
                        <div className="mt-2">
                            <p className="text-sm font-semibold">Overall Visibility</p>
                            <p className={cn("text-xs font-medium", overall.color)}>{overall.label}</p>
                        </div>
                    </div>
                </Card>

                {/* Sub scores */}
                {subScores.map(sub => {
                    const label = getScoreLabel(sub.score);
                    return (
                        <Card
                            key={sub.label}
                            className="border-border/50 hover:border-primary/30 cursor-pointer transition-all hover:shadow-md"
                            onClick={() => onNavigate(sub.tab)}
                        >
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", sub.bg)}>
                                        <sub.icon className={cn("h-5 w-5", sub.color)} />
                                    </div>
                                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <ScoreRing score={sub.score} size={70} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{sub.label}</p>
                                    <p className={cn("text-xs font-medium", label.color)}>{label.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{sub.desc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Pages Crawled", value: analysis.pagesAnalyzed, icon: GlobeIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Issues Found", value: analysis.issuesFound, icon: AlertTriangleIcon, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Critical Issues", value: criticalIssues, icon: AlertTriangleIcon, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Warnings", value: warnings, icon: AlertTriangleIcon, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                ].map(stat => (
                    <Card key={stat.label} className="border-border/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Wins */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4 text-yellow-500" />
                        Quick Wins
                        <span className="text-xs font-normal text-muted-foreground ml-1">— highest impact actions</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {analysis.quickWins.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-green-500">
                                <CheckCircle2Icon className="h-4 w-4" />
                                Great job! No major quick wins needed.
                            </div>
                        ) : (
                            analysis.quickWins.map((win, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm">{win}</p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                    variant="outline"
                    className="gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                    onClick={() => onNavigate("seo-boost")}
                >
                    <ZapIcon className="h-4 w-4" /> Auto-Fix SEO Issues
                </Button>
                <Button
                    variant="outline"
                    className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => onNavigate("geo-boost")}
                >
                    <GlobeIcon className="h-4 w-4" /> Boost GEO Presence
                </Button>
                <Button
                    variant="outline"
                    className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                    onClick={() => onNavigate("aeo-generator")}
                >
                    <MessageSquareIcon className="h-4 w-4" /> Generate FAQ Schema
                </Button>
            </div>
        </div>
    );
}
