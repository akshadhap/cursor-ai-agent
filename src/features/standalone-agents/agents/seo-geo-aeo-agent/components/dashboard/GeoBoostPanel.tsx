/**
 * VisibilityAI — GEO Boost Panel
 * AI auto-generates entity summaries, knowledge panel content, FAQ answers — monochrome
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
    BrainCircuitIcon,
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
            {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function CodeBlock({ code }: { code: string }) {
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
                        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                            <GlobeIcon className="h-4 w-4 text-background" />
                        </div>
                        GEO Boost
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Agent generates entity content to make your brand visible in AI search engines
                    </p>
                </div>
                <Button
                    onClick={handleGenerateBoost}
                    disabled={isGenerating}
                    className="gap-2"
                >
                    {isGenerating ? (
                        <><Loader2Icon className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                        <><SparklesIcon className="h-4 w-4" /> {geoBoost ? "Re-Generate" : "Generate GEO Boost"}</>
                    )}
                </Button>
            </div>

            {/* How it works */}
            <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <BrainCircuitIcon className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">How GEO Boost Works</p>
                            <p className="text-xs text-muted-foreground">
                                The AI agent generates an entity summary, knowledge panel content, FAQ answers, and Organization
                                JSON-LD schema optimized for AI search engines like Perplexity, ChatGPT plugins, and Google's
                                Search Generative Experience. Add this to your site to dramatically improve AI engine visibility.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!geoBoost && !isGenerating && (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-16 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <GlobeIcon className="h-8 w-8 text-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">No GEO Boost generated yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click "Generate GEO Boost" to create AI-optimized content for your brand
                            </p>
                        </div>
                        <Button
                            onClick={handleGenerateBoost}
                            className="gap-2"
                        >
                            <ZapIcon className="h-4 w-4" />
                            Generate GEO Boost
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isGenerating && (
                <Card className="border-border/50">
                    <CardContent className="py-16 text-center space-y-4">
                        <Loader2Icon className="h-10 w-10 text-foreground animate-spin mx-auto" />
                        <p className="text-sm font-semibold">Agent is generating GEO boost content...</p>
                        <p className="text-xs text-muted-foreground">Crafting entity definitions, FAQs, and schema markup</p>
                    </CardContent>
                </Card>
            )}

            {geoBoost && (
                <div className="space-y-5">
                    {/* AI Entity Knowledge Panel Combo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Left: Perplexity Mock */}
                        <Card className="border-border/50 flex flex-col overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b border-border pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                        <BookOpenIcon className="h-3.5 w-3.5 text-background" />
                                    </div>
                                    AI Search Simulation
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Entity summary optimized for AI answers</p>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 bg-background relative">
                                <h4 className="text-lg font-bold text-foreground mb-4">"What is {geoBoost.knowledgePanelContent?.name || websiteProfile.businessName}?"</h4>
                                <div className="space-y-4">
                                    {geoBoost.entitySummary ? (
                                        <p className="text-sm leading-relaxed text-foreground/90">
                                            {geoBoost.entitySummary}
                                        </p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 bg-muted/10 rounded-lg border border-dashed border-border/50">
                                            <SparklesIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
                                            <p className="text-xs font-semibold text-muted-foreground">Entity Synthesis Required</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-2 border-t border-border/50">
                                        <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-foreground/80 transition-colors" title={websiteProfile.domain}>1</span>
                                        {(geoBoost.suggestedCitations || []).slice(0,2).map((_, idx) => (
                                            <span key={idx} className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-muted/80 transition-colors">{idx + 2}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute bottom-4 right-4">
                                    <CopyButton text={geoBoost.entitySummary} label="Copy Summary" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Google Graph Mock */}
                        <Card className="border-border/50 flex flex-col overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b border-border pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                        <SparklesIcon className="h-3.5 w-3.5 text-background" />
                                    </div>
                                    Google Knowledge Panel Simulation
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Target SERP presence for branded queries</p>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 bg-background">
                                <div className="w-full h-full border border-border rounded-xl p-5 shadow-sm relative group hover:border-foreground/30 transition-colors">
                                    <h1 className="text-2xl font-bold tracking-tight">{geoBoost.knowledgePanelContent?.name || websiteProfile.businessName}</h1>
                                    <p className="text-sm font-medium text-muted-foreground mt-1">{geoBoost.knowledgePanelContent?.industry || websiteProfile.industry}</p>
                                    
                                    <hr className="my-4 border-border" />
                                    
                                    {geoBoost.knowledgePanelContent?.description || geoBoost.entitySummary ? (
                                        <>
                                            <p className="text-sm leading-relaxed mb-5 text-foreground/90">
                                                {geoBoost.knowledgePanelContent?.description || (geoBoost.entitySummary || "").substring(0, 120) + "..."}
                                            </p>
                                            
                                            <div className="space-y-3 text-sm">
                                                {geoBoost.knowledgePanelContent?.foundedYear && (
                                                    <div className="flex gap-4"><span className="font-semibold text-foreground w-24">Founded:</span> <span className="text-muted-foreground">{geoBoost.knowledgePanelContent.foundedYear}</span></div>
                                                )}
                                                {geoBoost.knowledgePanelContent?.headquarters && (
                                                    <div className="flex gap-4"><span className="font-semibold text-foreground w-24">Headquarters:</span> <span className="text-muted-foreground">{geoBoost.knowledgePanelContent.headquarters}</span></div>
                                                )}
                                                <div className="flex gap-4"><span className="font-semibold text-foreground w-24">Website:</span> <a className="text-[#1a0dab] hover:underline truncate" href={geoBoost.knowledgePanelContent?.website}>{geoBoost.knowledgePanelContent?.website}</a></div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 mt-4 text-center space-y-2 bg-muted/10 rounded-lg border border-dashed border-border/50">
                                            <ZapIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
                                            <p className="text-xs font-semibold text-muted-foreground">Knowledge Graph Offline</p>
                                            <p className="text-[10px] text-muted-foreground/70">Awaiting agent synchronization</p>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CopyButton text={JSON.stringify(geoBoost.knowledgePanelContent, null, 2)} label="Copy Fields" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* FAQ Answers */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                    <MessageSquareIcon className="h-3.5 w-3.5 text-background" />
                                </div>
                                AI-Ready FAQ Answers
                                <span className="text-xs font-normal text-muted-foreground ml-1">— for Perplexity, ChatGPT & voice search</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {geoBoost.faqAnswers && geoBoost.faqAnswers.length > 0 ? (
                                (geoBoost.faqAnswers || []).map((qa, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                                        <p className="text-sm font-semibold">{qa.question}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                                        <div className="flex justify-end">
                                            <CopyButton text={`Q: ${qa.question}\nA: ${qa.answer}`} label="Copy Q&A" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl bg-muted/10 text-center">
                                    <MessageSquareIcon className="h-5 w-5 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-sm font-medium text-muted-foreground">No Conversational Prompts Formulated</p>
                                    <p className="text-xs text-muted-foreground mt-1">Run GEO Boost to auto-generate answers.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Suggested Citations */}
                    {(geoBoost.suggestedCitations || []).length > 0 && (
                        <Card className="border-border/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                        <LinkIcon className="h-3.5 w-3.5 text-background" />
                                    </div>
                                    Suggested Citation Sources
                                    <span className="text-xs font-normal text-muted-foreground ml-1">— earn these mentions to boost GEO</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {(geoBoost.suggestedCitations || []).map((cite, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/40 border border-border/50">
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
                                <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                                    <CodeIcon className="h-3.5 w-3.5 text-background" />
                                </div>
                                Organization JSON-LD Schema
                                <span className="text-xs font-normal text-muted-foreground ml-1">— add to your homepage &lt;head&gt;</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {geoBoost.jsonLd ? (
                                <CodeBlock code={geoBoost.jsonLd || ""} />
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl bg-muted/10 text-center">
                                    <CodeIcon className="h-5 w-5 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-sm font-medium text-muted-foreground">Schema Block Empty</p>
                                </div>
                            )}
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
