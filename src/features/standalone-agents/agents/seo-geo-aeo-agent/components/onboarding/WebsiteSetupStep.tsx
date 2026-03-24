/**
 * VisibilityAI — Onboarding Step 1: Website Setup
 * User enters domain, competitors, industry, and focus goal
 */

"use client";

import { useState } from "react";
import {
    GlobeIcon,
    PlusIcon,
    XIcon,
    ArrowRightIcon,
    SearchIcon,
    SparklesIcon,
    ZapIcon,
    MessageSquareIcon,
    TargetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WebsiteProfile, Industry, FocusGoal } from "../../config";
import { INDUSTRIES, FOCUS_GOALS } from "../../config";

interface WebsiteSetupStepProps {
    onNext: (profile: WebsiteProfile) => void;
    initialData?: WebsiteProfile;
    isLoading?: boolean;
}

const focusGoalOptions = [
    {
        id: FOCUS_GOALS.ALL,
        label: "Full Visibility",
        description: "SEO + GEO + AEO combined for maximum impact",
        icon: TargetIcon,
        gradient: "from-purple-500 to-pink-600",
        bgGradient: "from-purple-500/10 to-pink-600/10",
    },
    {
        id: FOCUS_GOALS.SEO,
        label: "SEO Focus",
        description: "Rank higher on Google & Bing search results",
        icon: SearchIcon,
        gradient: "from-blue-500 to-cyan-600",
        bgGradient: "from-blue-500/10 to-cyan-600/10",
    },
    {
        id: FOCUS_GOALS.GEO,
        label: "GEO Focus",
        description: "Appear in AI search engines like Perplexity & ChatGPT",
        icon: GlobeIcon,
        gradient: "from-emerald-500 to-teal-600",
        bgGradient: "from-emerald-500/10 to-teal-600/10",
    },
    {
        id: FOCUS_GOALS.AEO,
        label: "AEO Focus",
        description: "Win featured snippets & voice search answers",
        icon: MessageSquareIcon,
        gradient: "from-orange-500 to-amber-600",
        bgGradient: "from-orange-500/10 to-amber-600/10",
    },
];

export function WebsiteSetupStep({ onNext, initialData, isLoading }: WebsiteSetupStepProps) {
    const [domain, setDomain] = useState(initialData?.domain || "");
    const [businessName, setBusinessName] = useState(initialData?.businessName || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [industry, setIndustry] = useState<Industry>(initialData?.industry || INDUSTRIES[0]);
    const [focusGoal, setFocusGoal] = useState<FocusGoal>(initialData?.focusGoal || FOCUS_GOALS.ALL);
    const [competitors, setCompetitors] = useState<string[]>(initialData?.competitors || [""]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const addCompetitor = () => {
        if (competitors.length < 3) {
            setCompetitors([...competitors, ""]);
        }
    };

    const removeCompetitor = (index: number) => {
        setCompetitors(competitors.filter((_, i) => i !== index));
    };

    const updateCompetitor = (index: number, value: string) => {
        const updated = [...competitors];
        updated[index] = value;
        setCompetitors(updated);
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!domain.trim()) newErrors.domain = "Domain is required";
        if (!businessName.trim()) newErrors.businessName = "Business name is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = () => {
        if (!validate()) return;
        const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
        const cleanCompetitors = competitors
            .map(c => c.replace(/^https?:\/\//, "").replace(/\/$/, "").trim())
            .filter(Boolean);

        onNext({
            domain: cleanDomain,
            businessName: businessName.trim(),
            description: description.trim(),
            industry,
            focusGoal,
            competitors: cleanCompetitors,
        });
    };

    return (
        <div className="min-h-screen flex items-start justify-center p-4 pt-8 bg-background overflow-auto">
            <div className="w-full max-w-2xl space-y-4 pb-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <span>Step 1 of 2</span>
                        <div className="flex gap-1">
                            <div className="w-8 h-1 rounded-full bg-primary" />
                            <div className="w-8 h-1 rounded-full bg-border" />
                        </div>
                    </div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                        <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Welcome to VisibilityAI</h1>
                    <p className="text-sm text-muted-foreground">
                        Tell us about your website and we'll analyze your full digital visibility
                    </p>
                </div>

                {/* Website Info */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <GlobeIcon className="h-4 w-4 text-blue-500" />
                            Your Website
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="domain" className="text-sm">
                                    Domain <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="domain"
                                        placeholder="example.com"
                                        value={domain}
                                        onChange={e => {
                                            setDomain(e.target.value);
                                            if (errors.domain) setErrors(prev => ({ ...prev, domain: "" }));
                                        }}
                                        className={cn("pl-9", errors.domain && "border-red-500")}
                                    />
                                </div>
                                {errors.domain && <p className="text-xs text-red-500">{errors.domain}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="businessName" className="text-sm">
                                    Business Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="businessName"
                                    placeholder="Acme Corp"
                                    value={businessName}
                                    onChange={e => {
                                        setBusinessName(e.target.value);
                                        if (errors.businessName) setErrors(prev => ({ ...prev, businessName: "" }));
                                    }}
                                    className={cn(errors.businessName && "border-red-500")}
                                />
                                {errors.businessName && <p className="text-xs text-red-500">{errors.businessName}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-sm">
                                Business Description <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <textarea
                                id="description"
                                rows={2}
                                placeholder="Briefly describe what your business does..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm">Industry</Label>
                            <select
                                value={industry}
                                onChange={e => setIndustry(e.target.value as Industry)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {INDUSTRIES.map(ind => (
                                    <option key={ind} value={ind}>{ind}</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Focus Goal */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ZapIcon className="h-4 w-4 text-purple-500" />
                            Optimization Focus
                        </CardTitle>
                        <CardDescription className="text-xs">What do you want to improve most?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {focusGoalOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setFocusGoal(opt.id)}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                                        "hover:shadow-md hover:scale-[1.01]",
                                        focusGoal === opt.id
                                            ? `border-primary bg-gradient-to-br ${opt.bgGradient} shadow-sm`
                                            : "border-border/50 hover:border-primary/40"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-gradient-to-br",
                                        opt.gradient
                                    )}>
                                        <opt.icon className="h-4 w-4 text-white" />
                                    </div>
                                    <p className="text-sm font-semibold">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Competitors */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <SearchIcon className="h-4 w-4 text-emerald-500" />
                            Competitor Domains <span className="text-xs font-normal text-muted-foreground">(up to 3, optional)</span>
                        </CardTitle>
                        <CardDescription className="text-xs">We'll compare your visibility against these</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {competitors.map((comp, idx) => (
                            <div key={idx} className="flex gap-2">
                                <div className="relative flex-1">
                                    <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={`competitor${idx + 1}.com`}
                                        value={comp}
                                        onChange={e => updateCompetitor(idx, e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                {competitors.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-muted-foreground hover:text-red-500"
                                        onClick={() => removeCompetitor(idx)}
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {competitors.length < 3 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCompetitor}
                                className="w-full gap-2 border-dashed"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Add Competitor
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Continue */}
                <Button
                    className="w-full h-11 text-sm font-semibold gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                    onClick={handleContinue}
                    disabled={isLoading}
                >
                    {isLoading ? "Starting analysis..." : "Analyze My Website"}
                    <ArrowRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
