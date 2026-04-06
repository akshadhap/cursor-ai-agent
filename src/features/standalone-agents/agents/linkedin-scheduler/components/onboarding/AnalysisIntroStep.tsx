/**
 * Step 2: Analysis Intro
 * Explains the analysis process and sets user expectations
 */

"use client";

import {
    SparklesIcon,
    LinkedinIcon,
    GlobeIcon,
    BarChart3Icon,
    TrendingUpIcon,
    ClockIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyProfile } from "../../config";

interface AnalysisIntroStepProps {
    companyProfile: CompanyProfile;
    onNext: () => void;
    onBack?: () => void;
    isLoading?: boolean;
}

const analysisFeatures = [
    {
        icon: LinkedinIcon,
        title: "LinkedIn Analysis",
        description: "We'll analyze your LinkedIn presence and content patterns",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
    },
    {
        icon: GlobeIcon,
        title: "Website & Link Analysis",
        description: "Extract key information from your website and shared content",
        color: "text-green-500",
        bgColor: "bg-green-500/10",
    },
    {
        icon: BarChart3Icon,
        title: "Industry Classification",
        description: "Identify your company type, categories, and industry positioning",
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
    },
    {
        icon: TrendingUpIcon,
        title: "Trend Detection",
        description: "Discover current trends relevant to your domain",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
    },
    {
        icon: ClockIcon,
        title: "Timing Optimization",
        description: "Find the best times to post for maximum engagement",
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
    },
];

export function AnalysisIntroStep({
    companyProfile,
    onNext,
    onBack,
    isLoading = false,
}: AnalysisIntroStepProps) {
    return (
        <div className="h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
            <Card className="w-full max-w-2xl border-border/50 max-h-[calc(100vh-2rem)] flex flex-col">
                <CardHeader className="text-center pb-2 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Step 3 of 7</span>
                    </div>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <SparklesIcon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Ready to Analyze Your Profile</CardTitle>
                    <CardDescription className="text-sm">
                        We&apos;ll analyze <span className="font-medium text-foreground">{companyProfile.businessName}</span> to
                        generate personalized content recommendations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 overflow-y-auto">
                    {/* What we'll analyze */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            What we&apos;ll analyze
                        </h3>
                        <div className="grid gap-2">
                            {analysisFeatures.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
                                >
                                    <div className={`p-2 rounded-lg ${feature.bgColor}`}>
                                        <feature.icon className={`h-4 w-4 ${feature.color}`} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium">{feature.title}</h4>
                                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Profile summary */}
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                        <h4 className="text-sm font-medium">Your Profile Summary</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Company:</span>{" "}
                                <span className="font-medium">{companyProfile.businessName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Industry:</span>{" "}
                                <span className="font-medium">{companyProfile.industry}</span>
                            </div>
                            {companyProfile.linkedInUrl && (
                                <div className="col-span-2 truncate">
                                    <span className="text-muted-foreground">LinkedIn:</span>{" "}
                                    <span className="font-medium text-primary">{companyProfile.linkedInUrl}</span>
                                </div>
                            )}
                            {companyProfile.websiteUrl && (
                                <div className="col-span-2 truncate">
                                    <span className="text-muted-foreground">Website:</span>{" "}
                                    <span className="font-medium">{companyProfile.websiteUrl}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            className="w-full h-11"
                            onClick={onNext}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="mr-2 h-4 w-4" />
                                    Start Analysis
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>

                        {onBack && (
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={onBack}
                                disabled={isLoading}
                            >
                                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        )}
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        Analysis typically takes 10-30 seconds
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
