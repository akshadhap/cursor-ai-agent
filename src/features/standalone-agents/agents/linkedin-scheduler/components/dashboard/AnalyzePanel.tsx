/**
 * Analyze Panel - Run & View Analysis
 * Shows analysis results and allows re-running analysis
 */

"use client";

import {
    SparklesIcon,
    RefreshCwIcon,
    TrendingUpIcon,
    UsersIcon,
    TagIcon,
    ClockIcon,
    CheckCircle2Icon,
    AlertCircleIcon,
    LightbulbIcon,
    Loader2Icon,
    BotIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { CompanyProfile, AnalysisResult } from "../../config";

interface AnalyzePanelProps {
    companyProfile: CompanyProfile;
    analysis: AnalysisResult | null;
    isAnalyzing: boolean;
    onRunAnalysis: () => void;
}

export function AnalyzePanel({
    companyProfile,
    analysis,
    isAnalyzing,
    onRunAnalysis,
}: AnalyzePanelProps) {
    if (!analysis) {
        // No analysis yet - show CTA
        return (
            <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Card className="max-w-lg border-border/50">
                    <CardContent className="p-8 text-center">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <BotIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Analyze your LinkedIn presence, website, and content to get personalized recommendations
                            and insights.
                        </p>
                        <Button onClick={onRunAnalysis} disabled={isAnalyzing} size="lg">
                            {isAnalyzing ? (
                                <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="mr-2 h-4 w-4" />
                                    Run AI Analysis
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">AI Analysis</h1>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(analysis.generatedAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Scraped Data Indicators */}
                    {analysis.scrapedData && (
                        <div className="flex gap-1.5 mr-2">
                            {analysis.scrapedData.linkedInAnalyzed && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                    LinkedIn
                                </Badge>
                            )}
                            {analysis.scrapedData.websiteAnalyzed && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                    <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                    Website
                                </Badge>
                            )}
                            {analysis.scrapedData.additionalUrlsAnalyzed > 0 && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                    +{analysis.scrapedData.additionalUrlsAnalyzed} URLs
                                </Badge>
                            )}
                        </div>
                    )}
                    <Button onClick={onRunAnalysis} disabled={isAnalyzing} variant="outline">
                        {isAnalyzing ? (
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCwIcon className="mr-2 h-4 w-4" />
                        )}
                        Re-analyze
                    </Button>
                </div>
            </div>

            {/* Strategy Score */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <TrendingUpIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">Strategy Score</h3>
                                <p className="text-xs text-muted-foreground">
                                    Overall content strategy health
                                </p>
                            </div>
                        </div>
                        <span className="text-4xl font-bold">{analysis.strategyScore}/100</span>
                    </div>
                    <Progress value={analysis.strategyScore} className="h-3" />
                </CardContent>
            </Card>

            {/* Classification Grid */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <TagIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm">Company Type</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-semibold">{analysis.companyType}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {analysis.categories.slice(0, 3).map((cat) => (
                                <Badge key={cat} variant="secondary" className="text-xs">
                                    {cat}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm">Audience Type</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-semibold">{analysis.audienceType}</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm">Best Times</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {analysis.optimalPostingTimes.slice(0, 2).map((time, i) => (
                                <p key={i} className="text-sm">
                                    <span className="font-medium">{time.day}:</span> {time.timeRange}
                                </p>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
                {/* Key Insights */}
                <Card className="border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Key Insights</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {analysis.keyInsights.map((insight, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "p-3 rounded-lg border",
                                    insight.type === "positive"
                                        ? "bg-green-500/5 border-green-500/20"
                                        : insight.type === "warning"
                                            ? "bg-yellow-500/5 border-yellow-500/20"
                                            : "bg-red-500/5 border-red-500/20"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    {insight.type === "positive" ? (
                                        <CheckCircle2Icon className="h-4 w-4 text-green-500 mt-0.5" />
                                    ) : (
                                        <AlertCircleIcon
                                            className={cn(
                                                "h-4 w-4 mt-0.5",
                                                insight.type === "warning" ? "text-yellow-500" : "text-red-500"
                                            )}
                                        />
                                    )}
                                    <div>
                                        <span className="text-sm font-medium">{insight.title}</span>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {insight.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Action Items */}
                <Card className="border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <LightbulbIcon className="h-4 w-4 text-yellow-500" />
                            <CardTitle className="text-base">Action Items</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {analysis.actionItems.map((item, index) => (
                                <li key={index} className="flex items-start gap-3 text-sm">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                        {index + 1}
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Trends */}
            {analysis.trends && analysis.trends.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUpIcon className="h-4 w-4 text-cyan-500" />
                            <CardTitle className="text-base">Trending in Your Industry</CardTitle>
                        </div>
                        <CardDescription>Current trends relevant to {companyProfile.industry}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {analysis.trends.map((trend, index) => (
                                <div key={index} className="p-4 rounded-lg border border-border/50 bg-card">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{trend.topic}</span>
                                        <Badge variant="secondary">{trend.relevance}%</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{trend.description}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Audience Insights */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-purple-500" />
                        <CardTitle className="text-base">Audience Insights</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{analysis.audienceInsights}</p>
                </CardContent>
            </Card>
        </div>
    );
}
