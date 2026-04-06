/**
 * VisibilityAI — Main Dashboard Shell
 * Sidebar navigation + panel router — monochrome (black/white) color scheme
 * With agentic activity log panel
 */

"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboardIcon,
    SearchCheckIcon,
    RocketIcon,
    GlobeIcon,
    SparklesIcon,
    MessageSquareIcon,
    FileTextIcon,
    CodeIcon,
    SettingsIcon,
    RefreshCwIcon,
    BrainCircuitIcon,
    ChevronRightIcon,
    ActivityIcon,
    XIcon,
    LineChartIcon,
    BlocksIcon,
    CommandIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { OverviewPanel } from "./OverviewPanel";
import { SeoAuditPanel } from "./SeoAuditPanel";
import { SeoBoostPanel } from "./SeoBoostPanel";
import { GeoAnalysisPanel } from "./GeoAnalysisPanel";
import { GeoBoostPanel } from "./GeoBoostPanel";
import { AeoGeneratorPanel } from "./AeoGeneratorPanel";
import { ContentBriefsPanel } from "./ContentBriefsPanel";
import { SchemaPanel } from "./SchemaPanel";
import { ImpactTrackerPanel } from "./ImpactTrackerPanel";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { Omnibar } from "./Omnibar";

import type {
    VisibilityAnalysis,
    WebsiteProfile,
    NavItemId,
    SeoBoostResult,
    GeoBoostResult,
    AeoResult,
    ContentBrief,
    SchemaBlock,
} from "../../config";

interface VisibilityDashboardProps {
    agentId: string;
    websiteProfile: WebsiteProfile;
    analysis: VisibilityAnalysis;
    activeTab: NavItemId;
    isAnalyzing: boolean;
    agentLog?: string[];
    onTabChange: (tab: NavItemId) => void;
    onRunAnalysis: () => void;
    onRunGeoCheck: () => void;
    onUpdateProfile: (profile: WebsiteProfile) => void;
    onSeoBoostGenerated: (boost: SeoBoostResult) => void;
    onGeoBoostGenerated: (boost: GeoBoostResult) => void;
    onAeoResultAdded: (result: AeoResult) => void;
    onBriefAdded: (brief: ContentBrief) => void;
    onSchemaGenerated: (block: SchemaBlock) => void;
}

const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboardIcon },
    { id: "seo-audit" as const, label: "SEO Audit", icon: SearchCheckIcon },
    { id: "seo-boost" as const, label: "SEO Boost", icon: RocketIcon },
    { id: "geo-analysis" as const, label: "GEO Analysis", icon: GlobeIcon },
    { id: "geo-boost" as const, label: "GEO Boost", icon: SparklesIcon },
    { id: "aeo-generator" as const, label: "AEO Generator", icon: MessageSquareIcon },
    { id: "content-briefs" as const, label: "Content Briefs", icon: FileTextIcon },
    { id: "schema" as const, label: "Schema", icon: CodeIcon },
    { id: "impact-tracker" as const, label: "Impact Tracker", icon: LineChartIcon },
    { id: "integrations" as const, label: "CMS Plugins", icon: BlocksIcon },
    { id: "settings" as const, label: "Settings", icon: SettingsIcon },
];

export function VisibilityDashboard({
    agentId,
    websiteProfile,
    analysis,
    activeTab,
    isAnalyzing,
    agentLog = [],
    onTabChange,
    onRunAnalysis,
    onRunGeoCheck,
    onUpdateProfile,
    onSeoBoostGenerated,
    onGeoBoostGenerated,
    onAeoResultAdded,
    onBriefAdded,
    onSchemaGenerated,
}: VisibilityDashboardProps) {

    const [showAgentLog, setShowAgentLog] = useState(false);
    const issueCount = (analysis.seoIssues || []).filter(i => i.severity === "critical").length;

    // Auto-show log when analyzing
    useEffect(() => {
        if (isAnalyzing) setShowAgentLog(true);
    }, [isAnalyzing]);

    return (
        <div className="flex h-full overflow-hidden">
            <Omnibar 
                onNavigate={onTabChange} 
                onRunAnalysis={onRunAnalysis} 
            />
            {/* Sidebar */}
            <aside className="w-56 border-r border-border flex flex-col bg-card flex-shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                            <GlobeIcon className="h-4 w-4 text-background" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold">VisibilityAI</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[110px]">
                                {websiteProfile.domain}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Score pill — all monochrome */}
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Visibility Score</span>
                        <span className="font-bold text-sm text-foreground">
                            {analysis.visibilityScore}/100
                        </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-foreground transition-all duration-500"
                            style={{ width: `${analysis.visibilityScore}%` }}
                        />
                    </div>
                    {issueCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{issueCount} critical issue{issueCount > 1 ? "s" : ""}</p>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                activeTab === item.id
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Agent Log Toggle */}
                <div className="px-2 pb-2 space-y-1 mt-1">
                    <button
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/50"
                    >
                        <span className="flex items-center gap-2">
                            <CommandIcon className="h-3.5 w-3.5" />
                            Command Center
                        </span>
                        <div className="flex items-center gap-0.5">
                            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 text-[9px] font-mono">⌘</kbd>
                            <kbd className="bg-background border border-border rounded px-1.5 py-0.5 text-[9px] font-mono">K</kbd>
                        </div>
                    </button>
                    <button
                        onClick={() => setShowAgentLog(v => !v)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                            showAgentLog
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                    >
                        <ActivityIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        Agent Log
                        {isAnalyzing && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-background animate-pulse" />
                        )}
                    </button>
                </div>

                {/* Bottom: Re-analyze + user */}
                <div className="p-4 border-t border-border space-y-3">
                    <Button
                        className="w-full gap-2 text-xs"
                        size="sm"
                        onClick={onRunAnalysis}
                        disabled={isAnalyzing}
                        variant="outline"
                    >
                        <RefreshCwIcon className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} />
                        {isAnalyzing ? "Analyzing..." : "Re-Analyze"}
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-medium flex-shrink-0">
                            {websiteProfile.businessName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-medium truncate">{websiteProfile.businessName}</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background min-w-0">
                {activeTab === "overview" && (
                    <OverviewPanel
                        analysis={analysis}
                        websiteProfile={websiteProfile}
                        isAnalyzing={isAnalyzing}
                        onRunAnalysis={onRunAnalysis}
                        onNavigate={onTabChange}
                    />
                )}
                {activeTab === "seo-audit" && (
                    <SeoAuditPanel
                        issues={analysis.seoIssues || []}
                        isAnalyzing={isAnalyzing}
                        onNavigate={onTabChange}
                    />
                )}
                {activeTab === "seo-boost" && (
                    <SeoBoostPanel
                        agentId={agentId}
                        crawledPages={analysis.crawledPages || []}
                        seoBoosts={analysis.seoBoosts || []}
                        onBoostGenerated={onSeoBoostGenerated}
                    />
                )}
                {activeTab === "geo-analysis" && (
                    <GeoAnalysisPanel
                        geoAnalysis={analysis.geoAnalysis}
                        isAnalyzing={isAnalyzing}
                        onNavigate={onTabChange}
                        onRunGeoCheck={onRunGeoCheck}
                    />
                )}
                {activeTab === "geo-boost" && (
                    <GeoBoostPanel
                        agentId={agentId}
                        websiteProfile={websiteProfile}
                        geoBoost={analysis.geoBoost}
                        onGeoBoostGenerated={onGeoBoostGenerated}
                    />
                )}
                {activeTab === "aeo-generator" && (
                    <AeoGeneratorPanel
                        agentId={agentId}
                        crawledPages={analysis.crawledPages || []}
                        aeoResults={analysis.aeoResults || []}
                        onAeoResultAdded={onAeoResultAdded}
                    />
                )}
                {activeTab === "content-briefs" && (
                    <ContentBriefsPanel
                        agentId={agentId}
                        contentBriefs={analysis.contentBriefs || []}
                        serpKeywords={analysis.serpKeywords || []}
                        onBriefAdded={onBriefAdded}
                    />
                )}
                {activeTab === "schema" && (
                    <SchemaPanel
                        agentId={agentId}
                        crawledPages={analysis.crawledPages || []}
                        websiteProfile={websiteProfile}
                        schemaBlocks={analysis.schemaBlocks || []}
                        onSchemaGenerated={onSchemaGenerated}
                    />
                )}
                {activeTab === "impact-tracker" && (
                    <ImpactTrackerPanel
                        websiteProfile={websiteProfile}
                        analysis={analysis}
                    />
                )}
                {activeTab === "integrations" && (
                    <IntegrationsPanel websiteProfile={websiteProfile} />
                )}
                {activeTab === "settings" && (
                    <SettingsPanel
                        websiteProfile={websiteProfile}
                        agentId={agentId}
                        isAnalyzing={isAnalyzing}
                        onUpdateProfile={onUpdateProfile}
                        onRunAnalysis={onRunAnalysis}
                    />
                )}
            </main>

            {/* Agent Log Panel — slides in from right */}
            {showAgentLog && (
                <aside className="w-72 border-l border-border flex flex-col bg-card flex-shrink-0">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                <BrainCircuitIcon className="h-3.5 w-3.5 text-background" />
                            </div>
                            <p className="text-sm font-semibold">Agent Activity</p>
                        </div>
                        <button
                            onClick={() => setShowAgentLog(false)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Status indicator */}
                    <div className={cn(
                        "px-3 py-2 border-b border-border flex items-center gap-2 text-xs",
                        isAnalyzing ? "bg-foreground/5" : "bg-background"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            isAnalyzing ? "bg-foreground animate-pulse" : "bg-muted-foreground"
                        )} />
                        <span className="text-muted-foreground">
                            {isAnalyzing ? "Agent running..." : "Agent idle"}
                        </span>
                    </div>

                    {/* Capability list */}
                    <div className="p-3 border-b border-border space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agent Capabilities</p>
                        {[
                            { icon: SearchCheckIcon, label: "SEO Issue Detection" },
                            { icon: GlobeIcon, label: "GEO Presence Check" },
                            { icon: MessageSquareIcon, label: "AEO FAQ Generation" },
                            { icon: FileTextIcon, label: "Content Brief Writer" },
                            { icon: CodeIcon, label: "Schema Markup Builder" },
                            { icon: RocketIcon, label: "SEO Auto-Boost" },
                        ].map(cap => (
                            <div key={cap.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <cap.icon className="h-3 w-3 text-foreground flex-shrink-0" />
                                {cap.label}
                            </div>
                        ))}
                    </div>

                    {/* Log */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {agentLog.length === 0 ? (
                            <div className="text-center py-8 space-y-2">
                                <ActivityIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                                <p className="text-xs text-muted-foreground">No activity yet</p>
                                <p className="text-xs text-muted-foreground">Run an analysis to see the agent work</p>
                            </div>
                        ) : (
                            agentLog.map((entry, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-2 text-xs"
                                >
                                    <ChevronRightIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground leading-relaxed">{entry}</span>
                                </div>
                            ))
                        )}

                        {/* Live indicator */}
                        {isAnalyzing && (
                            <div className="flex items-center gap-2 text-xs text-foreground">
                                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse flex-shrink-0" />
                                <span>Thinking...</span>
                            </div>
                        )}
                    </div>

                    {/* Domain info */}
                    <div className="p-3 border-t border-border">
                        <div className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Target</p>
                            <p className="text-xs font-mono font-medium truncate">{websiteProfile.domain}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>{analysis.pagesAnalyzed} pages</span>
                                <span>·</span>
                                <span>{analysis.issuesFound} issues</span>
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
