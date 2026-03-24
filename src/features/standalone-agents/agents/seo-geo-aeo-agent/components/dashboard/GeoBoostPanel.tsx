/**
 * VisibilityAI — GEO Boost Panel
 * AI auto-generates entity summaries, knowledge panel content, FAQ answers for AI engines
 */

"use client";

import { useState } from "react";
import {
    GlobeIcon,
    SparklesIcon,
    CopyIcon,
    CheckIcon,
    Loader2Icon,
    BookOpenIcon,
    MessageSquareIcon,
    LinkIcon,
    CodeIcon,
    ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GeoBoostResult, WebsiteProfile } from "../../config";

interface GeoBoostPanelProps {
    agentId: string;
    websiteProfile: WebsiteProfile;
    geoBoost: GeoBoostResult | null;
    onGeoBoostGenerated: (boost: GeoBoostResult) => void;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs">
            {copied ? <CheckIcon className="h-3 w-3 text-green-500" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
    return (
        <div className="relative">
            <div className="absolute top-2 right-2 z-10">
                <CopyButton text={code} label="Copy JSON-LD" />
            </div>
            <pre className="p-4 rounded-xl bg-muted/60 border border-border/50 text-xs overflow-x-auto leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export function GeoBoostPanel({ agentId, websiteProfile, geoBoost, onGeoBoostGenerated }: GeoBoostPanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateBoost = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch("/api/standalone-agents/seo-geo-aeo/geo-boost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, websiteProfile }),
            });

            if (!response.ok) throw new Error("GEO boost generation failed");
            const { boost } = await response.json();
            onGeoBoostGenerated(boost);
            toast.success("GEO boost content generated!");
        } catch (error) {
            console.error("[GEO Boost] Error:", error);
            toast.error("Failed to generate GEO boost");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <GlobeIcon className="h-6 w-6 text-emerald-500" />
                        GEO Boost
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        AI generates entity content to make your brand visible in AI search engines
                    </p>
                </div>
                <Button
                    onClick={handleGenerateBoost}
                    disabled={isGenerating}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                    {isGenerating ? (
                        <><Loader2Icon className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                        <><SparklesIcon className="h-4 w-4" /> {geoBoost ? "Re-Generate" : "Generate GEO Boost"}</>
                    )}
                </Button>
            </div>

            {/* How it works */}
            <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <SparklesIcon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">How GEO Boost Works</p>
                            <p className="text-xs text-muted-foreground">
                                Our AI generates an entity summary, knowledge panel content, FAQ answers, and Organization
                                JSON-LD schema optimized for AI search engines like Perplexity, ChatGPT plugins, and Google's
                                Search Generative Experience. Add this content to your site to dramatically improve AI engine visibility.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!geoBoost && !isGenerating && (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-16 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                            <GlobeIcon className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">No GEO Boost generated yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click "Generate GEO Boost" to create AI-optimized content for your brand
                            </p>
                        </div>
                        <Button
                            onClick={handleGenerateBoost}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                        >
                            <ZapIcon className="h-4 w-4" />
                            Generate GEO Boost
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isGenerating && (
                <Card className="border-emerald-500/20">
                    <CardContent className="py-16 text-center space-y-4">
                        <Loader2Icon className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
                        <p className="text-sm font-semibold">Generating GEO boost content...</p>
                        <p className="text-xs text-muted-foreground">AI is crafting entity definitions, FAQs, and schema markup</p>
                    </CardContent>
                </Card>
            )}

            {geoBoost && (
                <div className="space-y-5">
                    {/* Entity Summary */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <BookOpenIcon className="h-4 w-4 text-emerald-500" />
                                Brand Entity Summary
                                <span className="text-xs font-normal text-muted-foreground ml-1">— for AI crawlers & About pages</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-sm leading-relaxed">
                                {geoBoost.entitySummary}
                            </div>
                            <div className="flex justify-end">
                                <CopyButton text={geoBoost.entitySummary} label="Copy Summary" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Knowledge Panel Content */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4 text-emerald-500" />
                                Knowledge Panel Fields
                                <span className="text-xs font-normal text-muted-foreground ml-1">— for Google Knowledge Panel</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-border/50">
                                {Object.entries(geoBoost.knowledgePanelContent).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between py-2.5 gap-3">
                                        <span className="text-xs font-semibold text-muted-foreground capitalize w-28 flex-shrink-0">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span className="text-sm flex-1">{value}</span>
                                        <CopyButton text={String(value)} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* FAQ Answers */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <MessageSquareIcon className="h-4 w-4 text-emerald-500" />
                                AI-Ready FAQ Answers
                                <span className="text-xs font-normal text-muted-foreground ml-1">— for Perplexity, ChatGPT & voice search</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {geoBoost.faqAnswers.map((qa, idx) => (
                                <div key={idx} className="p-3 rounded-xl border border-border/50 space-y-2">
                                    <p className="text-sm font-semibold">{qa.question}</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                                    <div className="flex justify-end">
                                        <CopyButton text={`Q: ${qa.question}\nA: ${qa.answer}`} label="Copy Q&A" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Suggested Citations */}
                    {geoBoost.suggestedCitations.length > 0 && (
                        <Card className="border-border/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-emerald-500" />
                                    Suggested Citation Sources
                                    <span className="text-xs font-normal text-muted-foreground ml-1">— earn these mentions to boost GEO</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {geoBoost.suggestedCitations.map((cite, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/40">
                                            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <p>{cite}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Organization JSON-LD */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <CodeIcon className="h-4 w-4 text-emerald-500" />
                                Organization JSON-LD Schema
                                <span className="text-xs font-normal text-muted-foreground ml-1">— add to your homepage &lt;head&gt;</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CodeBlock code={geoBoost.jsonLd} />
                        </CardContent>
                    </Card>

                    <p className="text-xs text-center text-muted-foreground">
                        Generated on {new Date(geoBoost.generatedAt).toLocaleString()}
                    </p>
                </div>
            )}
        </div>
    );
}
