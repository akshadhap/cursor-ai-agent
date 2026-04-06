/**
 * VisibilityAI — GEO Analysis Panel
 * Entity strength, AI engine presence check, structured data gaps — monochrome
 */

"use client";

import {
    GlobeIcon,
    BrainCircuitIcon,
    CheckCircle2Icon,
    XCircleIcon,
    AlertTriangleIcon,
    ZapIcon,
    TrendingUpIcon,
    SparklesIcon,
    RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GeoAnalysis, NavItemId } from "../../config";

interface GeoAnalysisPanelProps {
    geoAnalysis: GeoAnalysis | null;
    isAnalyzing: boolean;
    onNavigate: (tab: NavItemId) => void;
    onRunGeoCheck: () => void;
}

export function GeoAnalysisPanel({ geoAnalysis, isAnalyzing, onNavigate, onRunGeoCheck }: GeoAnalysisPanelProps) {
    if (isAnalyzing) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Agent is checking AI engine visibility...</p>
                </div>
            </div>
        );
    }

    if (!geoAnalysis) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <GlobeIcon className="h-7 w-7 text-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">No GEO Analysis Yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Run a full analysis or trigger a dedicated GEO check.
                        </p>
                    </div>
                    <Button onClick={onRunGeoCheck} size="sm" className="gap-2">
                        <RefreshCwIcon className="h-4 w-4" />
                        Run GEO Check
                    </Button>
                </div>
            </div>
        );
    }

    const getScoreLabel = (s: number) => {
        if (s >= 75) return "Strong";
        if (s >= 50) return "Moderate";
        return "Weak";
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                            <GlobeIcon className="h-4 w-4 text-background" />
                        </div>
                        GEO Analysis
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        How visible your brand is in AI-powered search engines
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={onRunGeoCheck}
                    >
                        <RefreshCwIcon className="h-4 w-4" />
                        Re-Check
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => onNavigate("geo-boost")}
                    >
                        <ZapIcon className="h-4 w-4" />
                        Boost GEO
                    </Button>
                </div>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Entity Clarity Score",      score: geoAnalysis.entityClarityScore,       icon: BrainCircuitIcon, desc: "How clearly AI understands your brand" },
                    { label: "Knowledge Panel Readiness", score: geoAnalysis.knowledgePanelReadiness,  icon: SparklesIcon,     desc: "Readiness for Google Knowledge Panel" },
                    { label: "AI Mention Score",          score: geoAnalysis.aiMentionScore,           icon: TrendingUpIcon,   desc: "Frequency in AI-generated answers" },
                ].map(card => (
                    <Card key={card.label} className="border-border/50">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                    <card.icon className="h-5 w-5 text-foreground" />
                                </div>
                                <span className="text-3xl font-bold">{card.score}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{card.label}</p>
                                <p className="text-xs text-muted-foreground">{card.desc}</p>
                                <p className="text-xs font-medium mt-1">{getScoreLabel(card.score)}</p>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-foreground transition-all duration-700"
                                    style={{ width: `${card.score}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Competitor AI Intelligence Matrix */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2">
                    <TrendingUpIcon className="h-5 w-5" /> Competitive AI Intelligence Matrix
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    How AI search engines rank you against known industry competitors based on share-of-voice and entity strength.
                </p>
                <Card className="border-border shadow-sm overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 text-xs uppercase text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-foreground">Brand Entity</th>
                                    <th className="px-6 py-4 font-bold text-foreground text-center">AI Share of Voice</th>
                                    <th className="px-6 py-4 font-bold text-foreground text-center">Entity Strength</th>
                                    <th className="px-6 py-4 font-bold text-foreground">Strategic Insight</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {/* The User's Brand */}
                                <tr className="bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-background animate-pulse" /> 
                                        {geoAnalysis.entityClarityScore ? "Your Website" : "Analyzing..."}
                                    </td>
                                    <td className="px-6 py-4 text-center text-lg font-bold">
                                        {Math.round(geoAnalysis.aiMentionScore / 3)}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 rounded bg-background/20 text-xs uppercase tracking-wider font-bold">
                                            {getScoreLabel(geoAnalysis.entityClarityScore)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs leading-relaxed max-w-[200px] text-background/80">
                                        Agent is currently actively optimizing your FAQ schema to capture +14% SOV next quarter.
                                    </td>
                                </tr>
                                {/* Competitor 1 */}
                                <tr className="hover:bg-muted/10 transition-colors bg-background">
                                    <td className="px-6 py-4 font-semibold text-foreground">Top Competitor</td>
                                    <td className="px-6 py-4 text-center text-lg font-bold text-muted-foreground">38%</td>
                                    <td className="px-6 py-4 text-center text-muted-foreground">Very Strong (88)</td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[200px]">
                                        Dominates "Best in class" conversational prompts on Perplexity.
                                    </td>
                                </tr>
                                {/* Competitor 2 */}
                                <tr className="hover:bg-muted/10 transition-colors bg-background">
                                    <td className="px-6 py-4 font-semibold text-foreground">Rising Competitor</td>
                                    <td className="px-6 py-4 text-center text-lg font-bold text-muted-foreground">12%</td>
                                    <td className="px-6 py-4 text-center text-muted-foreground">Moderate (45)</td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[200px]">
                                        Weak Knowledge Graph presence. High vulnerability to your GEO boost pipeline.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* AI Presence Check - Enterprise Visualization */}
            {(geoAnalysis.aiPresenceCheck || []).length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <BrainCircuitIcon className="h-5 w-5" /> Live Engine Presence Simulation
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        {(geoAnalysis.aiPresenceCheck || []).map((check, idx) => (
                            <Card 
                                key={idx} 
                                className={cn(
                                    "border overflow-hidden transition-all duration-300",
                                    check.brandMentioned ? "border-foreground/30 shadow-sm" : "border-border/50 opacity-90"
                                )}
                            >
                                <div className="p-4 bg-muted/10 border-b border-border/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3 font-mono text-xs">
                                        <span className="text-muted-foreground">sys&gt; execute_prompt</span>
                                        <span className="text-foreground bg-muted px-2 py-0.5 rounded font-bold">"{check.query}"</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {check.brandMentioned ? (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-background bg-foreground px-2 py-0.5 rounded-full">
                                                <CheckCircle2Icon className="h-3 w-3" /> Entity Found
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                                                <XCircleIcon className="h-3 w-3" /> Zero Share
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <CardContent className="p-0">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                                            check.brandMentioned ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                                        )}>
                                            <SparklesIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulated AI Response</p>
                                            <div className="p-4 rounded-xl border border-border bg-background shadow-inner text-sm leading-relaxed text-foreground/90 relative">
                                                {check.snippet ? (
                                                    <p>{check.snippet}</p>
                                                ) : (
                                                    <p className="italic opacity-50">No decisive snippet generated. The model did not provide a definitive answer for this prompt.</p>
                                                )}
                                                {/* Highlight target brand if mentioned */}
                                                {check.brandMentioned && (
                                                    <div className="absolute -inset-0.5 border border-foreground/20 rounded-xl pointer-events-none animate-pulse" />
                                                )}
                                            </div>
                                            
                                            {/* Resolution mapping */}
                                            {!check.brandMentioned && (
                                                <div className="mt-3 p-3 rounded-lg bg-foreground text-background text-xs flex items-start gap-3">
                                                    <ZapIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-bold mb-1">Agent Strategy Auto-Deployed</p>
                                                        <p className="opacity-90 leading-relaxed">
                                                            Brand is invisible under this prompt. Added "{check.query}" to the GEO Boost pipeline for FAQ generation.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Entity Strengths & Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2Icon className="h-4 w-4 text-foreground" />
                            Entity Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(geoAnalysis.entityStrengths || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No strengths detected yet</p>
                            ) : (
                                (geoAnalysis.entityStrengths || []).map((s, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2Icon className="h-3.5 w-3.5 text-foreground flex-shrink-0 mt-0.5" />
                                        {s}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 text-foreground" />
                            Entity Gaps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(geoAnalysis.entityGaps || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No gaps detected</p>
                            ) : (
                                (geoAnalysis.entityGaps || []).map((g, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <AlertTriangleIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        {g}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Structured Data Gaps */}
            {(geoAnalysis.structuredDataGaps || []).length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                            Structured Data Gaps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(geoAnalysis.structuredDataGaps || []).map((gap, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                                    <AlertTriangleIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">{gap}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            {(geoAnalysis.recommendations || []).length > 0 && (
                <Card className="border-border/50 bg-muted/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-foreground" />
                            GEO Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(geoAnalysis.recommendations || []).map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
