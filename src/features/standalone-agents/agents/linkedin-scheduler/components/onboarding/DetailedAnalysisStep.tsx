/**
 * Step 3: Detailed Analysis
 * Shows AI analysis results and lets user understand their content categories
 */

"use client";

import {
    CheckCircle2Icon,
    AlertCircleIcon,
    TrendingUpIcon,
    UsersIcon,
    TagIcon,
    ArrowRightIcon,
    RefreshCwIcon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AnalysisResult, CompanyProfile } from "../../config";

interface DetailedAnalysisStepProps {
    companyProfile: CompanyProfile;
    analysis: AnalysisResult;
    onNext: () => void;
    onReanalyze: () => void;
    isLoading?: boolean;
}

export function DetailedAnalysisStep({
    companyProfile,
    analysis,
    onNext,
    onReanalyze,
    isLoading = false,
}: DetailedAnalysisStepProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-3xl border-border/50">
                <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">Step 3 of 5</span>
                    </div>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
                        <CheckCircle2Icon className="h-7 w-7 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">Analysis Complete</CardTitle>
                    <CardDescription className="text-base">
                        Here&apos;s what we learned about <span className="font-medium text-foreground">{companyProfile.businessName}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Strategy Score */}
                    <div className="p-4 rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUpIcon className="h-5 w-5 text-primary" />
                                <span className="font-medium">Strategy Score</span>
                            </div>
                            <span className="text-2xl font-bold">{analysis.strategyScore}/100</span>
                        </div>
                        <Progress value={analysis.strategyScore} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {analysis.strategyScore >= 80
                                ? "Excellent! Your profile is well-positioned for content."
                                : analysis.strategyScore >= 60
                                    ? "Good foundation. Review the recommendations below."
                                    : "Room for improvement. Follow the action items."}
                        </p>
                    </div>

                    {/* Company Classification */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border/50 bg-card">
                            <div className="flex items-center gap-2 mb-2">
                                <TagIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Company Type</span>
                            </div>
                            <p className="text-lg font-semibold">{analysis.companyType}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {analysis.categories.map((cat) => (
                                    <Badge key={cat} variant="secondary" className="text-xs">
                                        {cat}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg border border-border/50 bg-card">
                            <div className="flex items-center gap-2 mb-2">
                                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Audience Type</span>
                            </div>
                            <p className="text-lg font-semibold">{analysis.audienceType}</p>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium">Key Insights</h3>
                        <div className="space-y-2">
                            {analysis.keyInsights.slice(0, 4).map((insight, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "p-3 rounded-lg border flex items-start gap-3",
                                        insight.type === "positive"
                                            ? "bg-green-500/5 border-green-500/20"
                                            : insight.type === "warning"
                                                ? "bg-yellow-500/5 border-yellow-500/20"
                                                : "bg-red-500/5 border-red-500/20"
                                    )}
                                >
                                    {insight.type === "positive" ? (
                                        <CheckCircle2Icon className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    ) : (
                                        <AlertCircleIcon
                                            className={cn(
                                                "h-4 w-4 mt-0.5 shrink-0",
                                                insight.type === "warning" ? "text-yellow-500" : "text-red-500"
                                            )}
                                        />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{insight.title}</span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0",
                                                    insight.severity === "high"
                                                        ? "border-red-500/50 text-red-500"
                                                        : insight.severity === "medium"
                                                            ? "border-yellow-500/50 text-yellow-500"
                                                            : "border-green-500/50 text-green-500"
                                                )}
                                            >
                                                {insight.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Current Trends */}
                    {analysis.trends && analysis.trends.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Trending in Your Industry</h3>
                            <div className="flex flex-wrap gap-2">
                                {analysis.trends.map((trend, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="py-1.5 px-3"
                                        title={trend.description}
                                    >
                                        <TrendingUpIcon className="h-3 w-3 mr-1" />
                                        {trend.topic}
                                        <span className="ml-1 text-muted-foreground">({trend.relevance}%)</span>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audience Insights */}
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <h4 className="text-sm font-medium mb-2">Audience Insights</h4>
                        <p className="text-sm text-muted-foreground">{analysis.audienceInsights}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onReanalyze}
                            disabled={isLoading}
                        >
                            <RefreshCwIcon className="mr-2 h-4 w-4" />
                            Re-analyze
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={onNext}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Continue
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
