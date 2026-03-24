/**
 * VisibilityAI — Main Dashboard Shell
 * Sidebar navigation + panel router
 */

"use client";

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
    ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { OverviewPanel }      from "./OverviewPanel";
import { SeoAuditPanel }      from "./SeoAuditPanel";
import { SeoBoostPanel }      from "./SeoBoostPanel";
import { GeoAnalysisPanel }   from "./GeoAnalysisPanel";
import { GeoBoostPanel }      from "./GeoBoostPanel";
import { AeoGeneratorPanel }  from "./AeoGeneratorPanel";
import { ContentBriefsPanel } from "./ContentBriefsPanel";
import { SchemaPanel }        from "./SchemaPanel";
import { SettingsPanel }      from "./SettingsPanel";

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
    { id: "overview"       as const, label: "Overview",       icon: LayoutDashboardIcon, color: "text-purple-500" },
    { id: "seo-audit"      as const, label: "SEO Audit",      icon: SearchCheckIcon,     color: "text-blue-500" },
    { id: "seo-boost"      as const, label: "SEO Boost",      icon: RocketIcon,          color: "text-blue-400" },
    { id: "geo-analysis"   as const, label: "GEO Analysis",   icon: GlobeIcon,           color: "text-emerald-500" },
    { id: "geo-boost"      as const, label: "GEO Boost",      icon: SparklesIcon,        color: "text-emerald-400" },
    { id: "aeo-generator"  as const, label: "AEO Generator",  icon: MessageSquareIcon,   color: "text-purple-500" },
    { id: "content-briefs" as const, label: "Content Briefs", icon: FileTextIcon,        color: "text-orange-500" },
    { id: "schema"         as const, label: "Schema",         icon: CodeIcon,            color: "text-cyan-500" },
    { id: "settings"       as const, label: "Settings",       icon: SettingsIcon,        color: "text-muted-foreground" },
];

export function VisibilityDashboard({
    agentId,
    websiteProfile,
    analysis,
    activeTab,
    isAnalyzing,
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

    const issueCount = analysis.seoIssues.filter(i => i.severity === "critical").length;

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-56 border-r border-border/50 flex flex-col bg-card/50 flex-shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                            <ZapIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold">VisibilityAI</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {websiteProfile.domain}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Score pill */}
                <div className="px-4 py-3 border-b border-border/50">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Visibility Score</span>
                        <span className={cn(
                            "font-bold text-sm",
                            analysis.visibilityScore >= 75 ? "text-green-500" :
                            analysis.visibilityScore >= 50 ? "text-yellow-500" : "text-red-500"
                        )}>
                            {analysis.visibilityScore}/100
                        </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${analysis.visibilityScore}%` }}
                        />
                    </div>
                    {issueCount > 0 && (
                        <p className="text-xs text-red-500 mt-1">{issueCount} critical issue{issueCount > 1 ? "s" : ""}</p>
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
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", activeTab !== item.id && item.color)} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Bottom: Re-analyze */}
                <div className="p-4 border-t border-border/50">
                    <Button
                        className="w-full gap-2 text-xs"
                        size="sm"
                        onClick={onRunAnalysis}
                        disabled={isAnalyzing}
                        variant="outline"
                    >
                        <SparklesIcon className="h-3.5 w-3.5" />
                        {isAnalyzing ? "Analyzing..." : "Re-Analyze"}
                    </Button>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                            {websiteProfile.businessName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-medium truncate">{websiteProfile.businessName}</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background">
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
                        issues={analysis.seoIssues}
                        isAnalyzing={isAnalyzing}
                        onNavigate={onTabChange}
                    />
                )}
                {activeTab === "seo-boost" && (
                    <SeoBoostPanel
                        agentId={agentId}
                        crawledPages={analysis.crawledPages}
                        seoBoosts={analysis.seoBoosts}
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
                        crawledPages={analysis.crawledPages}
                        aeoResults={analysis.aeoResults}
                        onAeoResultAdded={onAeoResultAdded}
                    />
                )}
                {activeTab === "content-briefs" && (
                    <ContentBriefsPanel
                        agentId={agentId}
                        contentBriefs={analysis.contentBriefs}
                        serpKeywords={analysis.serpKeywords}
                        onBriefAdded={onBriefAdded}
                    />
                )}
                {activeTab === "schema" && (
                    <SchemaPanel
                        agentId={agentId}
                        crawledPages={analysis.crawledPages}
                        websiteProfile={websiteProfile}
                        schemaBlocks={analysis.schemaBlocks}
                        onSchemaGenerated={onSchemaGenerated}
                    />
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
        </div>
    );
}
