/**
 * Dashboard Panel - AI Insights & Content Suggestions
 */

"use client";

import { useState } from "react";
import {
    SparklesIcon,
    RefreshCwIcon,
    CalendarIcon,
    CopyIcon,
    ClockIcon,
    CheckCircle2Icon,
    AlertCircleIcon,
    LightbulbIcon,
    TrendingUpIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    BotIcon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type {
    CompanyProfile,
    AnalysisResult,
    ContentSuggestion,
    LinkedInPost,
    PostCategory,
} from "../../config";
import { CATEGORY_CONFIG } from "../../config";

interface DashboardPanelProps {
    businessProfile: CompanyProfile;
    aiAnalysis: AnalysisResult | null;
    suggestions: ContentSuggestion[];
    posts: LinkedInPost[];
    stats: {
        label: string;
        value: number;
        icon: React.ComponentType<{ className?: string }>;
        color: string;
        bgColor: string;
    }[];
    isAnalyzing: boolean;
    onRunAnalysis: () => void;
    onScheduleSuggestion: (suggestionId: string, scheduledFor: string) => void;
    onSaveDraft: (content: string, category: string, imageUrl?: string, postId?: string) => void;
}

export function DashboardPanel({
    businessProfile,
    aiAnalysis,
    suggestions,
    posts,
    stats,
    isAnalyzing,
    onRunAnalysis,
    onScheduleSuggestion,
    onSaveDraft,
}: DashboardPanelProps) {
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    // Get current week dates
    const getWeekDates = (offset: number) => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates(currentWeekOffset);
    const today = new Date();

    const handleCopySuggestion = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
    };

    const handleSchedule = (suggestion: ContentSuggestion) => {
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + 1);
        scheduledFor.setHours(10, 0, 0, 0);
        onScheduleSuggestion(suggestion.id, scheduledFor.toISOString());
    };

    const getPostsForDate = (date: Date) => {
        return posts.filter((post) => {
            if (!post.scheduledAt) return false;
            const postDate = new Date(post.scheduledAt);
            return (
                postDate.getFullYear() === date.getFullYear() &&
                postDate.getMonth() === date.getMonth() &&
                postDate.getDate() === date.getDate()
            );
        });
    };

    const isToday = (date: Date) => {
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Generate and schedule LinkedIn posts with AI
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Left Column - AI Insights */}
                <div className="space-y-6">
                    {aiAnalysis ? (
                        <>
                            {/* AI PR Insights Card */}
                            <Card className="border-border/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <BotIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">AI PR Insights</CardTitle>
                                            <CardDescription>Smart analysis of your strategy</CardDescription>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRunAnalysis}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? (
                                            <Loader2Icon className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <RefreshCwIcon className="h-4 w-4 mr-1" />
                                                Refresh
                                            </>
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Strategy Score */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-muted-foreground">Strategy Score</span>
                                            <span className="text-2xl font-bold">{aiAnalysis.strategyScore}/100</span>
                                        </div>
                                        <Progress value={aiAnalysis.strategyScore} className="h-2" />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {aiAnalysis.strategyScore >= 70
                                                ? "Great progress! Keep optimizing."
                                                : "Good progress. Review recommendations below."}
                                        </p>
                                    </div>

                                    {/* Content Mix Analysis */}
                                    <div>
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <TrendingUpIcon className="h-4 w-4" />
                                            Content Mix Analysis
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(aiAnalysis.contentMix).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-sm capitalize">
                                                        {key === "thoughtLeadership" ? "Thought Leadership" : key}
                                                    </span>
                                                    <span className="text-sm font-medium">{value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Key Insights */}
                                    <div>
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <SparklesIcon className="h-4 w-4" />
                                            Key Insights
                                        </h4>
                                        <div className="space-y-3">
                                            {aiAnalysis.keyInsights.map((insight, index) => (
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
                                                        ) : insight.type === "warning" ? (
                                                            <AlertCircleIcon className="h-4 w-4 text-yellow-500 mt-0.5" />
                                                        ) : (
                                                            <AlertCircleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">{insight.title}</span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-0",
                                                                        insight.severity === "high"
                                                                            ? "border-red-500 text-red-500"
                                                                            : insight.severity === "medium"
                                                                                ? "border-yellow-500 text-yellow-500"
                                                                                : "border-green-500 text-green-500"
                                                                    )}
                                                                >
                                                                    {insight.severity}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {insight.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Optimal Posting Times */}
                            <Card className="border-border/50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">Optimal Posting Times</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {aiAnalysis.optimalPostingTimes.map((time, index) => (
                                            <Badge key={index} variant="secondary" className="py-1.5">
                                                {time.day}: {time.timeRange} {time.timezone}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Items */}
                            <Card className="border-border/50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <LightbulbIcon className="h-4 w-4 text-yellow-500" />
                                        <CardTitle className="text-base">Action Items</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {aiAnalysis.actionItems.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm">
                                                <span className="text-muted-foreground">{index + 1}.</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        /* AI PR Agent - Run Analysis CTA */
                        <Card className="border-border/50">
                            <CardContent className="p-8 text-center">
                                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                                    <BotIcon className="h-10 w-10 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">AI PR Agent</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Get intelligent insights, recommendations, and analysis of your LinkedIn content
                                    strategy powered by AI.
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
                    )}
                </div>

                {/* Right Column - Content Suggestions */}
                <div className="space-y-6">
                    <Card className="border-border/50">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <LightbulbIcon className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Content Suggestions</CardTitle>
                                    <CardDescription>AI-generated posts tailored to your business</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {suggestions.length > 0 ? (
                                suggestions.slice(0, 5).map((suggestion) => {
                                    const categoryConfig = CATEGORY_CONFIG[suggestion.category];
                                    return (
                                        <div
                                            key={suggestion.id}
                                            className="p-4 rounded-lg border border-border/50 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-xs", categoryConfig.color, categoryConfig.bgColor)}
                                                >
                                                    {categoryConfig.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <TrendingUpIcon className="h-3 w-3" />
                                                    {suggestion.matchScore}% match
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-line">
                                                {suggestion.content.length > 200
                                                    ? suggestion.content.slice(0, 200) + "..."
                                                    : suggestion.content}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {suggestion.hashtags.map((tag) => (
                                                    <span key={tag} className="text-xs text-primary">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleSchedule(suggestion)}
                                                    disabled={suggestion.status === "scheduled"}
                                                >
                                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {suggestion.status === "scheduled" ? "Scheduled" : "Schedule"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCopySuggestion(suggestion.content)}
                                                >
                                                    <CopyIcon className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No suggestions yet.</p>
                                    <p className="text-xs mt-1">Run AI Analysis to generate content ideas.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Content Calendar */}
            <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle className="text-base">Content Calendar</CardTitle>
                            <CardDescription>
                                {monthNames[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentWeekOffset(0)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-3">
                        {weekDates.map((date, index) => {
                            const datePosts = getPostsForDate(date);
                            const isTodayDate = isToday(date);

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "min-h-[140px] rounded-lg border p-3",
                                        isTodayDate
                                            ? "border-primary bg-primary/5"
                                            : "border-border/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground">{dayNames[index]}</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "text-lg font-semibold",
                                                    isTodayDate && "text-primary"
                                                )}
                                            >
                                                {date.getDate()}
                                            </span>
                                            {isTodayDate && (
                                                <Badge className="text-[10px] px-1.5 py-0">Today</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {datePosts.length > 0 ? (
                                            datePosts.slice(0, 2).map((post) => {
                                                const categoryConfig = CATEGORY_CONFIG[post.category];
                                                const time = post.scheduledAt
                                                    ? new Date(post.scheduledAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })
                                                    : "";
                                                return (
                                                    <div
                                                        key={post.id}
                                                        className={cn(
                                                            "p-2 rounded text-xs",
                                                            categoryConfig.bgColor
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                                            <ClockIcon className="h-3 w-3" />
                                                            {time}
                                                        </div>
                                                        <p className="line-clamp-2 text-foreground">
                                                            {post.content.slice(0, 50)}...
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("mt-1 text-[9px] px-1 py-0", categoryConfig.color)}
                                                        >
                                                            {post.category}
                                                        </Badge>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <button className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-4 rounded border border-dashed border-border/50 hover:border-border transition-colors">
                                                <PlusIcon className="h-3 w-3" />
                                                Add post
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
