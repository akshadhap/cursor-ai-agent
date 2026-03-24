/**
 * VisibilityAI — GEO Analysis Panel
 * Entity strength, AI engine presence check, structured data gaps
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

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("font-semibold", color)}>{score}/100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", color.replace("text-", "bg-"))}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

export function GeoAnalysisPanel({ geoAnalysis, isAnalyzing, onNavigate, onRunGeoCheck }: GeoAnalysisPanelProps) {
    if (isAnalyzing) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm">Checking AI engine visibility...</p>
                </div>
            </div>
        );
    }

    if (!geoAnalysis) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <GlobeIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No GEO analysis yet</p>
                    <Button onClick={onRunGeoCheck} size="sm" variant="outline">Run GEO Check</Button>
                </div>
            </div>
        );
    }

    const getScoreColor = (s: number) => {
        if (s >= 75) return "text-green-500";
        if (s >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <GlobeIcon className="h-6 w-6 text-emerald-500" />
                        GEO Analysis
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        How visible your brand is in AI-powered search engines
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onNavigate("geo-boost")}
                >
                    <ZapIcon className="h-4 w-4" />
                    Boost GEO
                </Button>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Entity Clarity Score", score: geoAnalysis.entityClarityScore, icon: BrainCircuitIcon, desc: "How clearly AI understands your brand" },
                    { label: "Knowledge Panel Readiness", score: geoAnalysis.knowledgePanelReadiness, icon: SparklesIcon, desc: "Readiness for Google Knowledge Panel" },
                    { label: "AI Mention Score", score: geoAnalysis.aiMentionScore, icon: TrendingUpIcon, desc: "Frequency in AI-generated answers" },
                ].map(card => (
                    <Card key={card.label} className="border-border/50">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <card.icon className="h-5 w-5 text-emerald-500" />
                                </div>
                                <span className={cn("text-3xl font-bold", getScoreColor(card.score))}>
                                    {card.score}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{card.label}</p>
                                <p className="text-xs text-muted-foreground">{card.desc}</p>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full", getScoreColor(card.score).replace("text-", "bg-"))}
                                    style={{ width: `${card.score}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* AI Presence Check */}
            {geoAnalysis.aiPresenceCheck.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BrainCircuitIcon className="h-4 w-4 text-emerald-500" />
                            AI Engine Presence Check
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {geoAnalysis.aiPresenceCheck.map((check, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "p-4 rounded-xl border",
                                    check.brandMentioned
                                        ? "border-green-500/30 bg-green-500/5"
                                        : "border-red-500/30 bg-red-500/5"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {check.brandMentioned ? (
                                        <CheckCircle2Icon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground">Query:</p>
                                        <p className="text-sm font-medium italic">"{check.query}"</p>
                                        {check.snippet && (
                                            <>
                                                <p className="text-xs font-semibold text-muted-foreground mt-2">AI Answer:</p>
                                                <p className="text-sm text-muted-foreground">{check.snippet}</p>
                                            </>
                                        )}
                                        <span className={cn(
                                            "inline-block text-xs px-2 py-0.5 rounded-full mt-1",
                                            check.brandMentioned
                                                ? "bg-green-500/20 text-green-500"
                                                : "bg-red-500/20 text-red-500"
                                        )}>
                                            {check.brandMentioned ? "Brand Mentioned ✓" : "Brand Not Found ✗"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Entity Strengths & Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50 border-green-500/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-green-500 flex items-center gap-2">
                            <CheckCircle2Icon className="h-4 w-4" />
                            Entity Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {geoAnalysis.entityStrengths.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No strengths detected yet</p>
                            ) : (
                                geoAnalysis.entityStrengths.map((s, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                        {s}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 border-orange-500/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-orange-500 flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4" />
                            Entity Gaps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {geoAnalysis.entityGaps.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No gaps detected</p>
                            ) : (
                                geoAnalysis.entityGaps.map((g, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <AlertTriangleIcon className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                                        {g}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Structured Data Gaps */}
            {geoAnalysis.structuredDataGaps.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
                            Structured Data Gaps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {geoAnalysis.structuredDataGaps.map((gap, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                    <AlertTriangleIcon className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">{gap}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            {geoAnalysis.recommendations.length > 0 && (
                <Card className="border-border/50 border-emerald-500/20 bg-emerald-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-emerald-500" />
                            GEO Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {geoAnalysis.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
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
