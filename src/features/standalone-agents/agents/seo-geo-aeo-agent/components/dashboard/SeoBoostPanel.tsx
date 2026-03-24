/**
 * VisibilityAI — SEO Boost Panel
 * AI auto-generates optimized meta tags, titles, alt text, anchor text per page
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
    SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CrawledPage, SeoBoostResult } from "../../config";

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
            {copied ? <CheckIcon className="h-3 w-3 text-green-500" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function BoostResultCard({ boost }: { boost: SeoBoostResult }) {
    const [showAlt, setShowAlt] = useState(false);
    const [showLinks, setShowLinks] = useState(false);

    return (
        <Card className="border-border/50 border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ZapIcon className="h-4 w-4 text-blue-500" />
                    <span className="font-mono text-xs truncate">{boost.url}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <FileTextIcon className="h-3 w-3" /> Optimized Title Tag
                        </label>
                        <CopyButton text={boost.optimizedTitle} />
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border/50 text-sm font-medium">
                        {boost.optimizedTitle}
                    </div>
                    <p className="text-xs text-muted-foreground">{boost.optimizedTitle.length} characters (ideal: 50–60)</p>
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <FileTextIcon className="h-3 w-3" /> Optimized Meta Description
                        </label>
                        <CopyButton text={boost.optimizedMetaDescription} />
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border/50 text-sm text-muted-foreground">
                        {boost.optimizedMetaDescription}
                    </div>
                    <p className="text-xs text-muted-foreground">{boost.optimizedMetaDescription.length} characters (ideal: 120–160)</p>
                </div>

                {/* H1 */}
                {boost.optimizedH1 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-muted-foreground">Optimized H1</label>
                            <CopyButton text={boost.optimizedH1} />
                        </div>
                        <div className="p-2.5 rounded-lg bg-background border border-border/50 text-sm font-semibold">
                            {boost.optimizedH1}
                        </div>
                    </div>
                )}

                {/* Alt Text Suggestions */}
                {boost.altTextSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                        <button
                            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                            onClick={() => setShowAlt(e => !e)}
                        >
                            <span className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Image Alt Text Suggestions ({boost.altTextSuggestions.length})
                            </span>
                            {showAlt ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                        </button>
                        {showAlt && (
                            <div className="space-y-2 pl-3 border-l-2 border-blue-500/30">
                                {boost.altTextSuggestions.map((img, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <p className="text-xs font-mono text-muted-foreground truncate">{img.src}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 p-2 rounded-lg bg-background border border-border/50 text-xs">
                                                {img.suggestedAlt}
                                            </div>
                                            <CopyButton text={img.suggestedAlt} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Internal Link Suggestions */}
                {boost.internalLinkSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                        <button
                            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                            onClick={() => setShowLinks(e => !e)}
                        >
                            <span className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                Internal Link Anchors ({boost.internalLinkSuggestions.length})
                            </span>
                            {showLinks ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                        </button>
                        {showLinks && (
                            <div className="space-y-2 pl-3 border-l-2 border-blue-500/30">
                                {boost.internalLinkSuggestions.map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-muted-foreground truncate flex-1">{link.href}</span>
                                        <span className="text-xs px-2 py-1 rounded bg-background border border-border/50">
                                            "{link.suggestedAnchor}"
                                        </span>
                                        <CopyButton text={link.suggestedAnchor} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function SeoBoostPanel({ agentId, crawledPages, seoBoosts, onBoostGenerated }: SeoBoostPanelProps) {
    const [selectedPage, setSelectedPage] = useState<CrawledPage | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingUrl, setGeneratingUrl] = useState<string | null>(null);

    const handleBoostPage = async (page: CrawledPage) => {
        setIsGenerating(true);
        setGeneratingUrl(page.url);
        setSelectedPage(page);

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
                    <ZapIcon className="h-6 w-6 text-blue-500" />
                    SEO Boost
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    AI auto-generates optimized meta tags, alt text, and anchor text for each page
                </p>
            </div>

            {/* How it works */}
            <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <SparklesIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">How SEO Boost Works</p>
                            <p className="text-xs text-muted-foreground">
                                Click "Boost" on any crawled page. Our AI analyzes the content and generates optimized
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
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            No pages crawled yet. Run an analysis first.
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
                                            <GlobeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{page.title || "Untitled Page"}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">{page.url}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span>{page.wordCount} words</span>
                                                    <span>{page.images.length} images</span>
                                                    <span>{page.internalLinks.length} links</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleBoostPage(page)}
                                            disabled={isLoading || isGenerating}
                                            variant={hasBoost ? "outline" : "default"}
                                            className={cn("gap-2 flex-shrink-0", !hasBoost && "bg-blue-600 hover:bg-blue-700 text-white border-0")}
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
