/**
 * Connect LinkedIn Step - Final step in onboarding
 * Mandatory LinkedIn connection before accessing dashboard
 */

"use client";

import { useState, useEffect } from "react";
import {
    LinkedinIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    ZapIcon,
    BarChart3Icon,
    Loader2Icon,
    RefreshCwIcon,
    LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConnectLinkedInStepProps {
    onComplete: () => void;
    onBack: () => void;
    isConnected: boolean;
    onConnect: () => void;
    isConnecting?: boolean;
}

const benefits = [
    {
        icon: ZapIcon,
        title: "Auto-Post Scheduling",
        description: "Schedule posts to go live at optimal times",
    },
    {
        icon: BarChart3Icon,
        title: "Analytics & Insights",
        description: "Track engagement and grow your audience",
    },
    {
        icon: ShieldCheckIcon,
        title: "Secure Connection",
        description: "We use OAuth 2.0 for secure access",
    },
];

export function ConnectLinkedInStep({
    onComplete,
    onBack,
    isConnected,
    onConnect,
    isConnecting = false,
}: ConnectLinkedInStepProps) {
    const [checkingConnection, setCheckingConnection] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-xl border-border/50">
                <CardHeader className="text-center pb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">Step 7 of 7 - Final Step</span>
                    </div>
                    <div className={cn(
                        "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl",
                        isConnected ? "bg-green-500/10" : "bg-[#0a66c2]/10"
                    )}>
                        {isConnected ? (
                            <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        ) : (
                            <LinkedinIcon className="h-8 w-8 text-[#0a66c2]" />
                        )}
                    </div>
                    <CardTitle className="text-2xl">
                        {isConnected ? "LinkedIn Connected!" : "Connect Your LinkedIn"}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {isConnected
                            ? "Your LinkedIn account is connected. You're ready to start posting!"
                            : "Connect your LinkedIn account to start scheduling posts and tracking engagement."
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Benefits */}
                    {!isConnected && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                What you'll be able to do:
                            </h4>
                            <div className="space-y-2">
                                {benefits.map((benefit, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
                                    >
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <benefit.icon className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-medium">{benefit.title}</h5>
                                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Connection Status Card */}
                    <div className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        isConnected
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-dashed border-border"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    isConnected ? "bg-green-500" : "bg-[#0a66c2]"
                                )}>
                                    <LinkedinIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium">LinkedIn Account</p>
                                    <p className={cn(
                                        "text-sm",
                                        isConnected ? "text-green-600" : "text-muted-foreground"
                                    )}>
                                        {isConnected ? "Connected" : "Not connected"}
                                    </p>
                                </div>
                            </div>

                            {!isConnected && (
                                <Button
                                    onClick={onConnect}
                                    disabled={isConnecting}
                                    className="bg-[#0a66c2] hover:bg-[#004182]"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Connect
                                        </>
                                    )}
                                </Button>
                            )}

                            {isConnected && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    <span className="text-sm font-medium">Ready</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <Button
                            className="w-full h-11"
                            onClick={onComplete}
                            disabled={!isConnected}
                        >
                            {isConnected ? (
                                <>
                                    Go to Dashboard
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </>
                            ) : (
                                "Connect LinkedIn to Continue"
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={onBack}
                        >
                            Back to Previous Step
                        </Button>
                    </div>

                    {!isConnected && (
                        <p className="text-xs text-center text-muted-foreground">
                            We only request permissions needed to post on your behalf.
                            You can disconnect anytime from settings.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
