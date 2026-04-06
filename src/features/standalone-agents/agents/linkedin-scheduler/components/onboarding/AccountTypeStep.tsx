/**
 * Account Type Step - First step in onboarding
 * User selects Personal or Business account
 */

"use client";

import { useState } from "react";
import {
    UserIcon,
    BuildingIcon,
    ArrowRightIcon,
    CheckIcon,
    SparklesIcon,
    BriefcaseIcon,
    PenToolIcon,
    TrendingUpIcon,
    UsersIcon,
    TargetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AccountType } from "../../config";

interface AccountTypeStepProps {
    onNext: (accountType: AccountType) => void;
    initialType?: AccountType;
}

const accountTypes = [
    {
        id: "personal" as const,
        title: "Personal Account",
        description: "For individuals, thought leaders, creators, and professionals",
        icon: UserIcon,
        features: [
            { icon: PenToolIcon, text: "Build your personal brand" },
            { icon: TrendingUpIcon, text: "Grow your influence" },
            { icon: SparklesIcon, text: "Share your expertise" },
        ],
        gradient: "from-blue-500 to-purple-600",
        bgGradient: "from-blue-500/10 to-purple-600/10",
    },
    {
        id: "business" as const,
        title: "Business Account",
        description: "For companies, agencies, startups, and brands",
        icon: BuildingIcon,
        features: [
            { icon: TargetIcon, text: "Promote products & services" },
            { icon: UsersIcon, text: "Reach your target audience" },
            { icon: BriefcaseIcon, text: "Generate leads & sales" },
        ],
        gradient: "from-emerald-500 to-teal-600",
        bgGradient: "from-emerald-500/10 to-teal-600/10",
    },
];

export function AccountTypeStep({ onNext, initialType }: AccountTypeStepProps) {
    const [selected, setSelected] = useState<AccountType | null>(initialType || null);

    const handleContinue = () => {
        if (selected) {
            onNext(selected);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
            <Card className="w-full max-w-3xl border-border/50">
                <CardHeader className="text-center pb-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Step 1 of 7</span>
                    </div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <SparklesIcon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Welcome to PostFlow</CardTitle>
                    <CardDescription className="text-sm">
                        How will you be using LinkedIn? This helps us personalize your experience.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                    {/* Account Type Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {accountTypes.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelected(type.id)}
                                className={cn(
                                    "relative p-6 rounded-xl border-2 text-left transition-all duration-200",
                                    "hover:shadow-lg hover:scale-[1.02]",
                                    selected === type.id
                                        ? "border-primary bg-gradient-to-br shadow-md " + type.bgGradient
                                        : "border-border/50 hover:border-primary/50"
                                )}
                            >
                                {/* Selected indicator */}
                                {selected === type.id && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <CheckIcon className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                                    "bg-gradient-to-br",
                                    type.gradient
                                )}>
                                    <type.icon className="h-6 w-6 text-white" />
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-lg font-semibold mb-1">{type.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{type.description}</p>

                                {/* Features */}
                                <div className="space-y-2">
                                    {type.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <feature.icon className="h-4 w-4 text-primary" />
                                            <span>{feature.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Continue Button */}
                    <Button
                        className="w-full h-11"
                        onClick={handleContinue}
                        disabled={!selected}
                    >
                        Continue
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        You can change this later in settings
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
