/**
 * VisibilityAI — Onboarding Step 1: Website Setup
 * AI-enhanced: keyword preview + live domain intelligence as user types, Wincher-style
 */

"use client";

import { useState, useEffect, useRef } from "react";
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
    TrendingUpIcon,
    ChevronRightIcon,
    InfoIcon,
    CheckCircle2Icon,
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
    },
    {
        id: FOCUS_GOALS.SEO,
        label: "SEO Focus",
        description: "Rank higher on Google & Bing search results",
        icon: SearchIcon,
    },
    {
        id: FOCUS_GOALS.GEO,
        label: "GEO Focus",
        description: "Appear in AI search like Perplexity & ChatGPT",
        icon: GlobeIcon,
    },
    {
        id: FOCUS_GOALS.AEO,
        label: "AEO Focus",
        description: "Win featured snippets & voice search answers",
        icon: MessageSquareIcon,
    },
];

/** AI-powered preview keyword suggestions based on domain/industry */
function getDomainInsights(domain: string, industry: Industry): {
    estimatedKeywords: string[];
    tips: string[];
    categories: string[];
} {
    if (!domain || domain.length < 3) return { estimatedKeywords: [], tips: [], categories: [] };
    
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").split(".")[0];
    const name = cleanDomain.replace(/-/g, " ").replace(/_/g, " ");

    const industryKeywordMap: Record<string, string[]> = {
        "Technology / SaaS": [`${name} software`, `${name} platform`, `${name} pricing`, `${name} alternative`, `${name} review`, `best ${industry} tools`, `${name} integration`, `${name} API`],
        "E-commerce": [`${name} products`, `buy ${name}`, `${name} discount`, `${name} free shipping`, `${name} review`, `${name} coupon`, `best ${name} deals`],
        "Healthcare": [`${name} doctors`, `${name} services`, `${name} appointment`, `${name} specialists`, `${name} insurance`, `${name} clinic near me`],
        "Finance": [`${name} interest rates`, `${name} loans`, `${name} investment`, `${name} account`, `${name} fees`, `${name} calculator`],
        "Education": [`${name} courses`, `${name} online learning`, `${name} certification`, `${name} classes`, `learn with ${name}`, `${name} tutorial`],
        "Real Estate": [`${name} properties`, `${name} listings`, `homes for sale ${name}`, `${name} agent`, `${name} market`, `${name} neighborhood`],
        "Marketing": [`${name} marketing`, `${name} SEO services`, `${name} campaigns`, `${name} agency`, `marketing with ${name}`],
        "Restaurant / Food": [`${name} menu`, `${name} delivery`, `${name} reservation`, `${name} hours`, `${name} near me`, `${name} review`],
        "Travel": [`${name} hotels`, `${name} packages`, `book ${name}`, `${name} flights`, `${name} travel deals`, `${name} vacation`],
        "Legal": [`${name} lawyer`, `${name} attorney`, `${name} legal services`, `${name} consultation`, `${name} law firm`],
    };
    
    const categoryMap: Record<string, string[]> = {
        "Technology / SaaS": ["Brand Queries", "Feature Keywords", "Competitor Comparisons", "Integration Terms"],
        "E-commerce": ["Product Keywords", "Transactional Terms", "Brand + Discount", "Category Keywords"],
        "Healthcare": ["Service Keywords", "Location Terms", "Condition Keywords", "Specialist Queries"],
        "Finance": ["Product Terms", "Rate Comparisons", "Service Keywords", "Calculator Terms"],
        "Education": ["Course Keywords", "Certification Terms", "Learning Queries", "Tutorial Keywords"],
    };
    
    const tipMap: Record<string, string[]> = {
        "Technology / SaaS": [
            "Target long-tail comparison keywords like '[your brand] vs [competitor]'",
            "Create dedicated product feature pages for each core capability",
            "Publish case studies to capture '[industry] + ROI' searches",
        ],
        "E-commerce": [
            "Optimize product pages for transactional keywords with high purchase intent",
            "Add structured data markup to product pages for rich snippets",
            "Build category pages targeting broader shopping terms",
        ],
        "Healthcare": [
            "Include location modifiers for 'near me' searches",
            "Target symptom-based questions for AEO (voice search)",
            "Build authoritative content around health conditions you treat",
        ],
    };
    
    const baseKeywords = industryKeywordMap[industry] || [
        `${name} services`, `${name} solutions`, `${name} review`,
        `best ${name}`, `${name} pricing`, `${name} how to use`
    ];
    
    const categories = categoryMap[industry] || ["Brand Keywords", "Service Keywords", "Informational Queries", "Comparison Terms"];
    const tips = tipMap[industry] || [
        "Build topical authority with in-depth content on your core topics",
        "Optimize for GEO by adding clear entity descriptions to your About page",
        "Use FAQ schema to target voice search and People Also Ask sections",
    ];
    
    return { estimatedKeywords: baseKeywords.slice(0, 8), tips, categories };
}

export function WebsiteSetupStep({ onNext, initialData, isLoading }: WebsiteSetupStepProps) {
    const [domain, setDomain] = useState(initialData?.domain || "");
    const [businessName, setBusinessName] = useState(initialData?.businessName || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [industry, setIndustry] = useState<Industry>(initialData?.industry || INDUSTRIES[0]);
    const [focusGoal, setFocusGoal] = useState<FocusGoal>(initialData?.focusGoal || FOCUS_GOALS.ALL);
    const [competitors, setCompetitors] = useState<string[]>(initialData?.competitors || [""]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // AI Preview
    const [insights, setInsights] = useState<ReturnType<typeof getDomainInsights>>({ estimatedKeywords: [], tips: [], categories: [] });
    const [showInsights, setShowInsights] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const newInsights = getDomainInsights(domain, industry);
            setInsights(newInsights);
            setShowInsights(newInsights.estimatedKeywords.length > 0);
        }, 600);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [domain, industry]);

    const addCompetitor = () => {
        if (competitors.length < 3) setCompetitors([...competitors, ""]);
    };
    const removeCompetitor = (index: number) => setCompetitors(competitors.filter((_, i) => i !== index));
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
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <span>Step 1 of 2</span>
                        <div className="flex gap-1">
                            <div className="w-8 h-1 rounded-full bg-foreground" />
                            <div className="w-8 h-1 rounded-full bg-border" />
                        </div>
                    </div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-foreground shadow-lg">
                        <SparklesIcon className="h-6 w-6 text-background" />
                    </div>
                    <h1 className="text-2xl font-bold">Welcome to VisibilityAI</h1>
                    <p className="text-sm text-muted-foreground">
                        Tell us about your website and we'll analyze your full digital visibility
                    </p>
                </div>

                {/* Website Info */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <GlobeIcon className="h-4 w-4" />
                            Your Website
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="domain" className="text-sm">
                                    Domain <span className="text-muted-foreground">*</span>
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
                                        className={cn("pl-9", errors.domain && "border-foreground")}
                                    />
                                </div>
                                {errors.domain && <p className="text-xs text-destructive">{errors.domain}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="businessName" className="text-sm">
                                    Business Name <span className="text-muted-foreground">*</span>
                                </Label>
                                <Input
                                    id="businessName"
                                    placeholder="Acme Corp"
                                    value={businessName}
                                    onChange={e => {
                                        setBusinessName(e.target.value);
                                        if (errors.businessName) setErrors(prev => ({ ...prev, businessName: "" }));
                                    }}
                                    className={cn(errors.businessName && "border-foreground")}
                                />
                                {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
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

                {/* AI Keyword Preview — appears once domain is typed */}
                {showInsights && (
                    <Card className="border-border border-dashed bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4" />
                                AI Keyword Preview
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                    — estimated targets for your site
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Keyword chips */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                    Suggested Target Keywords
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {insights.estimatedKeywords.map((kw, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border border-border text-xs font-medium"
                                        >
                                            <TrendingUpIcon className="h-2.5 w-2.5 text-muted-foreground" />
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Categories */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                    Keyword Categories to Target
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {insights.categories.map((cat, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-background border border-border">
                                            <CheckCircle2Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SEO Tips */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                                    <InfoIcon className="h-3 w-3" />
                                    AI Recommendations for {industry}
                                </p>
                                <div className="space-y-1.5">
                                    {insights.tips.map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                            <ChevronRightIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                            {tip}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <SparklesIcon className="h-3 w-3" />
                                Full keyword analysis & rankings will be generated during the deep scan
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Focus Goal */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ZapIcon className="h-4 w-4" />
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
                                        "hover:shadow-sm",
                                        focusGoal === opt.id
                                            ? "border-foreground bg-foreground/5"
                                            : "border-border hover:border-foreground/40"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                                        focusGoal === opt.id ? "bg-foreground" : "bg-muted"
                                    )}>
                                        <opt.icon className={cn("h-4 w-4", focusGoal === opt.id ? "text-background" : "text-foreground")} />
                                    </div>
                                    <p className="text-sm font-semibold">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Competitors */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <SearchIcon className="h-4 w-4" />
                            Competitor Domains{" "}
                            <span className="text-xs font-normal text-muted-foreground">(up to 3, optional)</span>
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
                                        className="h-10 w-10 text-muted-foreground hover:text-foreground"
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
                    className="w-full h-11 text-sm font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 border-0"
                    onClick={handleContinue}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <SparklesIcon className="h-4 w-4 animate-pulse" />
                            Starting analysis...
                        </>
                    ) : (
                        <>
                            Analyze My Website
                            <ArrowRightIcon className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
