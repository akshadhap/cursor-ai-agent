/**
 * VisibilityAI — SEO Audit Panel
 * Page-by-page issues with severity badges and fix suggestions
 */

"use client";

import { useState } from "react";
import {
    AlertTriangleIcon,
    AlertCircleIcon,
    InfoIcon,
    CheckCircle2Icon,
    ChevronDownIcon,
    ChevronUpIcon,
    ZapIcon,
    FilterIcon,
    SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SeoIssue, Severity, NavItemId } from "../../config";

interface SeoAuditPanelProps {
    issues: SeoIssue[];
    isAnalyzing: boolean;
    onNavigate: (tab: NavItemId) => void;
}

const severityConfig = {
    critical: {
        label: "Critical",
        icon: AlertCircleIcon,
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        badge: "bg-red-500/20 text-red-500 border-red-500/30",
    },
    warning: {
        label: "Warning",
        icon: AlertTriangleIcon,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        badge: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    },
    info: {
        label: "Info",
        icon: InfoIcon,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        badge: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    },
    good: {
        label: "Good",
        icon: CheckCircle2Icon,
        color: "text-green-500",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        badge: "bg-green-500/20 text-green-500 border-green-500/30",
    },
};

function IssueCard({ issue }: { issue: SeoIssue }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = severityConfig[issue.severity];

    return (
        <div className={cn("rounded-xl border p-4 transition-all duration-200", cfg.border, cfg.bg)}>
            <div
                className="flex items-start justify-between cursor-pointer gap-3"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <cfg.icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", cfg.color)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{issue.title}</p>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full border font-medium",
                                cfg.badge
                            )}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{issue.url}</p>
                    </div>
                </div>
                <div className={cn("flex-shrink-0 mt-1", cfg.color)}>
                    {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </div>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                        <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                            <ZapIcon className="h-3 w-3 text-yellow-500" />
                            How to fix
                        </p>
                        <p className="text-xs text-muted-foreground">{issue.fix}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

type FilterType = "all" | Severity;

export function SeoAuditPanel({ issues, isAnalyzing, onNavigate }: SeoAuditPanelProps) {
    const [filter, setFilter] = useState<FilterType>("all");
    const [search, setSearch] = useState("");

    const counts = {
        all:      issues.length,
        critical: issues.filter(i => i.severity === "critical").length,
        warning:  issues.filter(i => i.severity === "warning").length,
        info:     issues.filter(i => i.severity === "info").length,
        good:     issues.filter(i => i.severity === "good").length,
    };

    const filtered = issues
        .filter(i => filter === "all" || i.severity === filter)
        .filter(i =>
            !search ||
            i.title.toLowerCase().includes(search.toLowerCase()) ||
            i.url.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2, good: 3 };
            return order[a.severity] - order[b.severity];
        });

    const filterOptions: { key: FilterType; label: string; count: number; color: string }[] = [
        { key: "all",      label: "All",      count: counts.all,      color: "text-foreground" },
        { key: "critical", label: "Critical", count: counts.critical, color: "text-red-500" },
        { key: "warning",  label: "Warning",  count: counts.warning,  color: "text-yellow-500" },
        { key: "info",     label: "Info",     count: counts.info,     color: "text-blue-500" },
        { key: "good",     label: "Good",     count: counts.good,     color: "text-green-500" },
    ];

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">SEO Audit</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {issues.length} issues found across {new Set(issues.map(i => i.url)).size} pages
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => onNavigate("seo-boost")}
                >
                    <ZapIcon className="h-4 w-4" />
                    Auto-Fix with AI
                </Button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search issues or URLs..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                    <FilterIcon className="h-4 w-4 text-muted-foreground" />
                    {filterOptions.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setFilter(opt.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                filter === opt.key
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            {opt.label}{" "}
                            <span className={cn("ml-1", filter === opt.key ? "opacity-80" : opt.color)}>
                                ({opt.count})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Issues list */}
            {isAnalyzing ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <div className="text-center space-y-3">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Analyzing your pages...</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-2">
                            <CheckCircle2Icon className="h-10 w-10 text-green-500 mx-auto" />
                            <p className="text-sm font-medium">
                                {search || filter !== "all" ? "No matching issues" : "No issues found!"}
                            </p>
                            <p className="text-xs text-muted-foreground">Your pages look clean in this category.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(issue => (
                        <IssueCard key={issue.id} issue={issue} />
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Critical", count: counts.critical, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Warning",  count: counts.warning,  color: "text-yellow-500", bg: "bg-yellow-500/10" },
                    { label: "Info",     count: counts.info,     color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Good",     count: counts.good,     color: "text-green-500", bg: "bg-green-500/10" },
                ].map(s => (
                    <Card key={s.label} className="border-border/50">
                        <CardContent className="p-4 text-center">
                            <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
