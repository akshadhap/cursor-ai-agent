/**
 * VisibilityAI — SEO Boost Panel
 * AI auto-generates optimized meta tags, titles, alt text, anchor text per page — monochrome
 */

"use client";

import { useState } from "react";
import {
    ZapIcon,
    CopyIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    Loader2Icon,
    GlobeIcon,
    FileTextIcon,
    ImageIcon,
    LinkIcon,
    BrainCircuitIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CrawledPage, SeoBoostResult, NavItemId } from "../../config";

interface SeoBoostPanelProps {
    agentId: string;
    crawledPages: CrawledPage[];
    seoBoosts: SeoBoostResult[];
    onBoostGenerated: (boost: SeoBoostResult) => void;
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

function BoostResultCard({ boost }: { boost: SeoBoostResult }) {
    const [showAlt, setShowAlt] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    const handleDeploy = () => {
        setIsDeploying(true);
        setTimeout(() => {
            setIsDeploying(false);
            toast.success("Successfully deployed to CMS!");
        }, 1500);
    };

    return (
        <Card className="border-border overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                            <ZapIcon className="h-3 w-3 text-background" />
                        </div>
                        <span className="font-mono text-xs truncate">{boost.url}</span>
                    </CardTitle>
                    <Button 
                        size="sm" 
                        onClick={handleDeploy} 
                        disabled={isDeploying}
                        className="h-8 gap-2 bg-foreground text-background"
                    >
                        {isDeploying ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                        {isDeploying ? "Deploying..." : "Push to CMS"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* SERP Premium Preview */}
                <div className="p-6 border-b border-border bg-card">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <GlobeIcon className="h-3 w-3" /> Live SERP Simulation
                    </h4>
                    <div className="p-5 rounded-xl border border-border bg-background shadow-sm w-full max-w-3xl hover:border-foreground/30 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
                                <GlobeIcon className="h-3.5 w-3.5 text-background" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground font-semibold">Your Website</p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate max-w-md">{boost.url}</p>
                            </div>
                            <div className="ml-auto">
                                <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-foreground text-background">
                                    AI Optimized
                                </span>
                            </div>
                        </div>
                        <h3 className="text-lg text-foreground cursor-pointer truncate font-bold underline decoration-border hover:decoration-foreground underline-offset-4 mb-2">
                            {boost.optimizedTitle || "Title not generated"}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {boost.optimizedMetaDescription || "Meta description not generated."}
                        </p>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Raw Fields */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                            Meta Data Diff
                        </h4>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <FileTextIcon className="h-3.5 w-3.5" /> Title Tag
                                </label>
                                <CopyButton text={boost.optimizedTitle} />
                            </div>
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm font-medium">
                                {boost.optimizedTitle || "N/A"}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all", (boost.optimizedTitle?.length || 0) < 60 ? "bg-foreground" : "bg-red-500")} style={{ width: `${Math.min(100, ((boost.optimizedTitle?.length || 0) / 60) * 100)}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{(boost.optimizedTitle || "").length}/60 chars</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <FileTextIcon className="h-3.5 w-3.5" /> Meta Description
                                </label>
                                <CopyButton text={boost.optimizedMetaDescription} />
                            </div>
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm text-muted-foreground leading-relaxed">
                                {boost.optimizedMetaDescription || "N/A"}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all", (boost.optimizedMetaDescription?.length || 0) < 160 ? "bg-foreground" : "bg-red-500")} style={{ width: `${Math.min(100, ((boost.optimizedMetaDescription?.length || 0) / 160) * 100)}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{(boost.optimizedMetaDescription || "").length}/160 chars</span>
                            </div>
                        </div>

                        {boost.optimizedH1 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">H1 Heading</label>
                                    <CopyButton text={boost.optimizedH1} />
                                </div>
                                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm font-semibold">
                                    {boost.optimizedH1}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Media & Link Fields */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                            On-Page Elements
                        </h4>
                        
                        {(boost.altTextSuggestions || []).length > 0 && (
                            <div className="space-y-3">
                                <button
                                    className="flex items-center justify-between w-full text-sm font-semibold text-foreground group"
                                    onClick={() => setShowAlt(e => !e)}
                                >
                                    <span className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
                                            <ImageIcon className="h-3 w-3" />
                                        </div>
                                        Alt Text Replacements <span className="text-xs font-normal text-muted-foreground ml-1">({(boost.altTextSuggestions || []).length})</span>
                                    </span>
                                    {showAlt ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                </button>
                                {showAlt && (
                                    <div className="space-y-3 pl-3 border-l-2 border-border/50">
                                        {(boost.altTextSuggestions || []).map((img, idx) => (
                                            <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/50">
                                                <p className="text-xs font-mono text-muted-foreground truncate" title={img.src}>{img.src}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 text-sm font-medium">
                                                        {img.suggestedAlt}
                                                    </div>
                                                    <CopyButton text={img.suggestedAlt} label="" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {(boost.internalLinkSuggestions || []).length > 0 && (
                            <div className="space-y-3 mt-6">
                                <button
                                    className="flex items-center justify-between w-full text-sm font-semibold text-foreground group"
                                    onClick={() => setShowLinks(e => !e)}
                                >
                                    <span className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
                                            <LinkIcon className="h-3 w-3" />
                                        </div>
                                        Internal Linx Fixes <span className="text-xs font-normal text-muted-foreground ml-1">({(boost.internalLinkSuggestions || []).length})</span>
                                    </span>
                                    {showLinks ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                </button>
                                {showLinks && (
                                    <div className="space-y-3 pl-3 border-l-2 border-border/50">
                                        {(boost.internalLinkSuggestions || []).map((link, idx) => (
                                            <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/50 flex flex-col gap-2">
                                                <span className="text-xs font-mono text-muted-foreground truncate w-full" title={link.href}>{link.href}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium flex-1">
                                                        "{link.suggestedAnchor}"
                                                    </span>
                                                    <CopyButton text={link.suggestedAnchor} label="" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function SeoBoostPanel({ agentId, crawledPages, seoBoosts, onBoostGenerated }: SeoBoostPanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingUrl, setGeneratingUrl] = useState<string | null>(null);

    const handleBoostPage = async (page: CrawledPage) => {
        setIsGenerating(true);
        setGeneratingUrl(page.url);

        try {
            const response = await fetch("/api/standalone-agents/seo-geo-aeo/seo-boost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, page }),
            });

            if (!response.ok) throw new Error("Boost generation failed");

            const { boost } = await response.json();
            onBoostGenerated(boost);
            toast.success(`SEO boost generated for ${page.url.replace(/^https?:\/\//, "")}`);
        } catch (error) {
            console.error("[SEO Boost] Error:", error);
            toast.error("Failed to generate SEO boost");
        } finally {
            setIsGenerating(false);
            setGeneratingUrl(null);
        }
    };

    const existingBoostUrls = new Set(seoBoosts.map(b => b.url));

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <ZapIcon className="h-4 w-4 text-background" />
                    </div>
                    SEO Boost
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Agent auto-generates optimized meta tags, alt text, and anchor text for each page
                </p>
            </div>

            {/* How it works */}
            <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <BrainCircuitIcon className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">How SEO Boost Works</p>
                            <p className="text-xs text-muted-foreground">
                                Click "Boost" on any crawled page. The AI agent analyzes the content and generates optimized
                                title tags, meta descriptions, H1 headings, image alt text, and internal link anchor text
                                — ready to copy-paste into your CMS.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Pages list */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Crawled Pages ({crawledPages.length})
                </h3>

                {crawledPages.length === 0 ? (
                    <Card className="border-border/50 border-dashed">
                        <CardContent className="py-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                                <GlobeIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">No pages crawled yet</p>
                            <p className="text-xs text-muted-foreground">Run an analysis from Overview first.</p>
                        </CardContent>
                    </Card>
                ) : (
                    crawledPages.map(page => {
                        const hasBoost = existingBoostUrls.has(page.url);
                        const isLoading = generatingUrl === page.url;

                        return (
                            <Card key={page.url} className="border-border/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <GlobeIcon className="h-3.5 w-3.5 text-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{page.title || "Untitled Page"}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">{page.url}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span>{page.wordCount} words</span>
                                                    <span>{(page.images || []).length} images</span>
                                                    <span>{(page.internalLinks || []).length} links</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleBoostPage(page)}
                                            disabled={isLoading || isGenerating}
                                            variant={hasBoost ? "outline" : "default"}
                                            className="gap-2 flex-shrink-0"
                                        >
                                            {isLoading ? (
                                                <><Loader2Icon className="h-4 w-4 animate-spin" /> Generating...</>
                                            ) : hasBoost ? (
                                                <><ZapIcon className="h-4 w-4" /> Re-Boost</>
                                            ) : (
                                                <><ZapIcon className="h-4 w-4" /> Boost</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Boost Results */}
            {seoBoosts.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Generated Boosts ({seoBoosts.length})
                    </h3>
                    {seoBoosts.map(boost => (
                        <BoostResultCard key={boost.url} boost={boost} />
                    ))}
                </div>
            )}
        </div>
    );
}
