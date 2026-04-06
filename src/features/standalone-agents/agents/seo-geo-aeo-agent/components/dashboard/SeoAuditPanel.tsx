/**
 * VisibilityAI — SEO Audit Panel
 * Page-by-page issues with severity badges and fix suggestions — monochrome theme
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
    BrainCircuitIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
        color: "text-foreground",
        bg: "bg-foreground/8",
        border: "border-foreground/20",
        badge: "bg-foreground text-background",
    },
    warning: {
        label: "Warning",
        icon: AlertTriangleIcon,
        color: "text-foreground",
        bg: "bg-muted/60",
        border: "border-border",
        badge: "bg-muted text-foreground border border-border",
    },
    info: {
        label: "Info",
        icon: InfoIcon,
        color: "text-muted-foreground",
        bg: "bg-muted/30",
        border: "border-border/60",
        badge: "bg-muted/50 text-muted-foreground border border-border/50",
    },
    good: {
        label: "Good",
        icon: CheckCircle2Icon,
        color: "text-muted-foreground",
        bg: "bg-muted/20",
        border: "border-border/40",
        badge: "bg-muted/30 text-muted-foreground border border-border/40",
    },
};

function IssueCard({ issue }: { issue: SeoIssue }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.info;

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
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                cfg.badge
                            )}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{issue.url}</p>
                    </div>
                </div>
                <div className="flex-shrink-0 mt-1 text-muted-foreground">
                    {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">{issue.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* DOM Trace Mock */}
                        <div className="p-4 rounded-xl bg-card border border-border shadow-inner font-mono text-[10px] space-y-1.5 relative overflow-hidden group">
                            <div className={cn(
                                "absolute top-0 left-0 w-full h-1", 
                                cfg.bg.replace('/8', '').replace('/60', '').replace('/30', '').replace('/20', '')
                            )} />
                            <p className="text-muted-foreground uppercase font-bold tracking-widest mb-3 border-b border-border/50 pb-2 flex items-center gap-2">
                                <SearchIcon className="h-3 w-3" /> DOM Live Inspector
                            </p>
                            <p className="text-muted-foreground transition-all">&lt;!DOCTYPE html&gt;</p>
                            <p className="text-muted-foreground transition-all">&lt;html lang="en"&gt;</p>
                            <p className="pl-4 text-muted-foreground transition-all">&lt;head&gt;</p>
                            <p className="pl-8 text-muted-foreground transition-all">&lt;title&gt;Current Page&lt;/title&gt;</p>
                            <div className={cn("pl-8 py-1 my-1 rounded border border-dashed", cfg.border, cfg.bg)}>
                                <p className={cn("inline-block font-bold", cfg.color)}>&lt;!-- ALERT: {issue.title.toUpperCase()} --&gt;</p>
                            </div>
                            <p className="pl-8 text-muted-foreground transition-all">&lt;meta name="description" ... /&gt;</p>
                            <p className="pl-4 text-muted-foreground transition-all">&lt;/head&gt;</p>
                            <p className="text-muted-foreground transition-all">&lt;body&gt;</p>
                        </div>

                        {/* AI Resolution Path */}
                        <div className="p-5 rounded-xl bg-foreground text-background font-sans relative overflow-hidden flex flex-col justify-between shadow-lg">
                            {/* Decorative background logo */}
                            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                                <BrainCircuitIcon className="w-32 h-32 text-background" />
                            </div>
                            <div>
                                <p className="text-[10px] text-background/60 uppercase font-black tracking-widest mb-3 border-b border-background/20 pb-2 flex items-center gap-1.5">
                                    <ZapIcon className="h-3.5 w-3.5" /> Agent Resolution Map
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-background mt-1.5 flex-shrink-0" />
                                        <p className="text-sm font-medium leading-relaxed">{issue.fix}</p>
                                    </div>
                                    <div className="flex items-start gap-2 opacity-70">
                                        <div className="w-1.5 h-1.5 rounded-full bg-background mt-1.5 flex-shrink-0" />
                                        <p className="text-xs">Compile and stage patch for CMS deployment</p>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                className="w-full mt-6 text-xs font-bold gap-2 bg-background text-foreground hover:bg-muted transition-colors border-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success("Agent dispatched to execute fix.");
                                }}
                            >
                                <CheckCircle2Icon className="h-4 w-4" /> Execute Agentic Patch
                            </Button>
                        </div>
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

    const filterOptions: { key: FilterType; label: string; count: number }[] = [
        { key: "all",      label: "All",      count: counts.all },
        { key: "critical", label: "Critical", count: counts.critical },
        { key: "warning",  label: "Warning",  count: counts.warning },
        { key: "info",     label: "Info",     count: counts.info },
        { key: "good",     label: "Good",     count: counts.good },
    ];

    if (isAnalyzing) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Agent is auditing your pages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">SEO Audit</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {issues.length === 0
                            ? "No audit data yet. Run an analysis to detect issues."
                            : `${issues.length} issues found across ${new Set(issues.map(i => i.url)).size} pages`}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => onNavigate("seo-boost")}
                >
                    <ZapIcon className="h-4 w-4" />
                    Auto-Fix with AI
                </Button>
            </div>

            {issues.length === 0 ? (
                /* Agentic empty state */
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <BrainCircuitIcon className="h-7 w-7 text-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Awaiting Agent Analysis</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Run a full analysis from Overview to populate SEO issues.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => onNavigate("overview")}>
                            Go to Overview
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
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
                                            ? "bg-foreground text-background"
                                            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    {opt.label} <span className="ml-1 opacity-70">({opt.count})</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Issues list */}
                    {filtered.length === 0 ? (
                        <Card className="border-border/50">
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center space-y-2">
                                    <CheckCircle2Icon className="h-10 w-10 text-muted-foreground mx-auto" />
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
                            { label: "Critical", count: counts.critical },
                            { label: "Warning",  count: counts.warning },
                            { label: "Info",     count: counts.info },
                            { label: "Good",     count: counts.good },
                        ].map(s => (
                            <Card key={s.label} className="border-border/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold">{s.count}</p>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
