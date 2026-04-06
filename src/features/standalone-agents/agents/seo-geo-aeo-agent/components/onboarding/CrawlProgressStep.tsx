/**
 * VisibilityAI — Onboarding Step 2: Crawl Progress
 * Shows real-time crawl status and transitions to dashboard
 */

"use client";

import { useEffect, useState } from "react";
import {
    GlobeIcon,
    SearchIcon,
    BrainCircuitIcon,
    CheckCircle2Icon,
    Loader2Icon,
    SparklesIcon,
    ZapIcon,
    MessageSquareIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WebsiteProfile } from "../../config";

interface CrawlProgressStepProps {
    websiteProfile: WebsiteProfile;
    progress: number;       // 0-100
    status: string;         // current status message
    isComplete: boolean;
    error?: string;
}

const stages = [
    { id: "crawl",    label: "Crawling website pages",       icon: GlobeIcon,        threshold: 20 },
    { id: "extract",  label: "Extracting content & metadata", icon: SearchIcon,       threshold: 45 },
    { id: "serp",     label: "Checking keyword rankings",     icon: ZapIcon,          threshold: 60 },
    { id: "ai",       label: "Running AI analysis",           icon: BrainCircuitIcon, threshold: 80 },
    { id: "aeo",      label: "Generating AEO & schema",       icon: MessageSquareIcon,threshold: 90 },
    { id: "done",     label: "Finalizing results",            icon: SparklesIcon,     threshold: 100 },
];

export function CrawlProgressStep({ websiteProfile, progress, status, isComplete, error }: CrawlProgressStepProps) {
    const [dots, setDots] = useState(".");

    useEffect(() => {
        if (isComplete) return;
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? "." : d + ".");
        }, 500);
        return () => clearInterval(interval);
    }, [isComplete]);

    return (
        <div className="h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-lg space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>Step 2 of 2</span>
                        <div className="flex gap-1">
                            <div className="w-8 h-1 rounded-full bg-foreground" />
                            <div className="w-8 h-1 rounded-full bg-foreground" />
                        </div>
                    </div>

                    {isComplete ? (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground shadow-lg animate-bounce">
                            <CheckCircle2Icon className="h-8 w-8 text-background" />
                        </div>
                    ) : (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground shadow-lg">
                            <Loader2Icon className="h-8 w-8 text-background animate-spin" />
                        </div>
                    )}

                    <h1 className="text-xl font-bold">
                        {isComplete ? "Analysis Complete!" : `Analyzing ${websiteProfile.domain}${dots}`}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isComplete
                            ? "Your VisibilityAI dashboard is ready"
                            : "This usually takes 20–60 seconds"
                        }
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{status}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-foreground transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stages */}
                <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                        {stages.map(stage => {
                            const isDone = progress >= stage.threshold;
                            const isActive = progress < stage.threshold && progress >= (stages[stages.indexOf(stage) - 1]?.threshold ?? 0);

                            return (
                                <div key={stage.id} className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                                        isDone
                                            ? "bg-foreground text-background"
                                            : isActive
                                                ? "bg-foreground/20 text-foreground"
                                                : "bg-muted text-muted-foreground"
                                    )}>
                                        {isDone ? (
                                            <CheckCircle2Icon className="h-4 w-4" />
                                        ) : isActive ? (
                                            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <stage.icon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-sm transition-colors",
                                        isDone ? "text-foreground line-through opacity-60" :
                                        isActive ? "text-foreground font-medium" :
                                        "text-muted-foreground"
                                    )}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Domain info */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground">
                        <GlobeIcon className="h-4 w-4" />
                        <span className="font-mono">{websiteProfile.domain}</span>
                        {websiteProfile.competitors.length > 0 && (
                            <span className="text-xs">+ {websiteProfile.competitors.length} competitors</span>
                        )}
                    </div>
                </div>

                {/* Error state */}
                {error && (
                    <div className="p-3 rounded-lg bg-muted border border-border text-sm text-foreground">
                        ⚠ {error}
                    </div>
                )}
            </div>
        </div>
    );
}
