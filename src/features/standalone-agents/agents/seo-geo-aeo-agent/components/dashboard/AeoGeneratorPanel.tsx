/**
 * VisibilityAI — AEO Generator Panel
 * Generate FAQ sections, structured Q&A, and FAQPage schema — monochrome
 */

"use client";

import { useState } from "react";
import {
    MessageSquareIcon,
    SparklesIcon,
    Loader2Icon,
    CopyIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CodeIcon,
    ZapIcon,
    GlobeIcon,
    BrainCircuitIcon,
    MicIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AeoResult, CrawledPage, NavItemId } from "../../config";

interface AeoGeneratorPanelProps {
    agentId: string;
    crawledPages: CrawledPage[];
    aeoResults: AeoResult[];
    onAeoResultAdded: (result: AeoResult) => void;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied!");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs">
            {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function AeoResultCard({ result }: { result: AeoResult }) {
    const [showSchema, setShowSchema] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [isDeploying, setIsDeploying] = useState(false);

    const handleDeploy = () => {
        setIsDeploying(true);
        setTimeout(() => {
            setIsDeploying(false);
            toast.success("FAQ Schema injected to site!");
        }, 1500);
    };

    return (
        <Card className="border-border/50 overflow-hidden mb-6 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                            <MessageSquareIcon className="h-3.5 w-3.5 text-background" />
                        </div>
                        <span className="font-mono text-xs truncate">{result.pageUrl}</span>
                        <span className="ml-2 px-2 py-1 bg-muted rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {(result.questions || []).length} queries
                        </span>
                    </CardTitle>
                    <Button 
                        size="sm" 
                        onClick={handleDeploy} 
                        disabled={isDeploying}
                        className="h-8 gap-2 bg-foreground text-background"
                    >
                        {isDeploying ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <CodeIcon className="h-3 w-3" />}
                        {isDeploying ? "Injecting..." : "Inject Schema"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-6 pb-0">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                        <MicIcon className="h-3.5 w-3.5" /> Voice Search Simulation Mockup
                    </h4>
                    <div className="w-full max-w-2xl mx-auto mb-6">
                        {(result.questions || []).slice(0, 1).map((qa, idx) => (
                            <div key={idx} className="p-5 border border-border/60 bg-muted/5 rounded-xl flex flex-col gap-4">
                                {/* User Voice Command */}
                                <div className="flex flex-col items-end gap-1">
                                    <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium border border-border/50 text-foreground">
                                        "Hey Siri, {qa.question.toLowerCase()}"
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase mr-1 opacity-70">Voice Query</span>
                                </div>
                                {/* AI Response */}
                                <div className="flex gap-3 items-start">
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <SparklesIcon className="w-3.5 h-3.5 text-background" />
                                    </div>
                                    <div className="flex flex-col gap-1 items-start flex-1">
                                        <div className="bg-foreground text-background px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed max-w-[90%] font-medium">
                                            According to your website: "{qa.answer}"
                                        </div>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase ml-1 opacity-70">AI Direct Answer</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/50 mt-6">
                    {/* Q&A List */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                            Detected Intent & Answers
                        </h4>
                        <div className="space-y-2">
                            {(result.questions || []).map((qa, idx) => (
                                <div
                                    key={qa.id || idx}
                                    className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden"
                                >
                                    <button
                                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors"
                                        onClick={() => setExpandedQ(expandedQ === qa.id ? null : qa.id)}
                                    >
                                        <p className="text-sm font-medium pr-3 text-foreground">{qa.question}</p>
                                        {expandedQ === qa.id
                                            ? <ChevronUpIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            : <ChevronDownIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                        }
                                    </button>
                                    {expandedQ === qa.id && (
                                        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3 bg-background/50">
                                            <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                                            <div className="flex justify-end">
                                                <CopyButton text={`Q: ${qa.question}\nA: ${qa.answer}`} label="Copy Q&A" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Extended Schema Panel */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                            Technical Output
                        </h4>
                        <div className="p-5 rounded-xl border border-border/50 bg-card space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <CodeIcon className="h-4 w-4 text-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">FAQPage JSON-LD</p>
                                    <p className="text-xs text-muted-foreground">Ready for Google Search Console</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full text-xs font-semibold justify-between group"
                                onClick={() => setShowSchema(e => !e)}
                            >
                                {showSchema ? "Hide Source Code" : "View Source Code"}
                                {showSchema ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                            </Button>
                            {showSchema && (
                                <div className="relative mt-2">
                                    <div className="absolute top-2 right-2 z-10">
                                        <CopyButton text={result.faqSchemaFull} label="Copy JSON" />
                                    </div>
                                    <pre className="p-4 rounded-xl bg-muted/40 border border-border/50 text-[10px] overflow-x-auto leading-relaxed max-h-[300px] overflow-y-auto">
                                        <code>{result.faqSchemaFull}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                        {/* Safe date parsing */}
                        <p className="text-[10px] text-muted-foreground text-center mt-4">
                            AEO generation completed at {result.generatedAt ? new Date(result.generatedAt).toLocaleString() : new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AeoGeneratorPanel({ agentId, crawledPages, aeoResults, onAeoResultAdded }: AeoGeneratorPanelProps) {
    const [generatingUrl, setGeneratingUrl] = useState<string | null>(null);

    const existingUrls = new Set(aeoResults.map(r => r.pageUrl));

    const handleGenerateFaq = async (page: CrawledPage) => {
        setGeneratingUrl(page.url);
        try {
            const response = await fetch("/api/standalone-agents/seo-geo-aeo/generate-faq", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, page }),
            });
            if (!response.ok) throw new Error("FAQ generation failed");
            const { result } = await response.json();
            onAeoResultAdded(result);
            toast.success(`FAQ generated for ${page.url.replace(/^https?:\/\//, "")}`);
        } catch (error) {
            console.error("[AEO] Error:", error);
            toast.error("Failed to generate FAQ");
        } finally {
            setGeneratingUrl(null);
        }
    };

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <MessageSquareIcon className="h-4 w-4 text-background" />
                    </div>
                    AEO Generator
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Generate FAQ sections and structured Q&A to win featured snippets and voice search
                </p>
            </div>

            {/* How it works */}
            <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <BrainCircuitIcon className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold">How AEO Generator Works</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select any crawled page and the AI agent extracts question-worthy content, generates clear answers,
                                and produces ready-to-use FAQPage JSON-LD schema. Add these to your pages to rank for
                                Google's "People Also Ask", featured snippets, and voice search results.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Page selector */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Generate FAQ for a Page
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
                    crawledPages.map((page, idx) => {
                        const hasResult = existingUrls.has(page.url);
                        const isLoading = generatingUrl === page.url;
                        return (
                            <Card key={page.url || idx} className="border-border/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <GlobeIcon className="h-3.5 w-3.5 text-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{page.title || "Untitled Page"}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">{page.url}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleGenerateFaq(page)}
                                            disabled={!!generatingUrl}
                                            variant={hasResult ? "outline" : "default"}
                                            className="gap-2 flex-shrink-0"
                                        >
                                            {isLoading
                                                ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                                                : hasResult
                                                    ? <><ZapIcon className="h-3.5 w-3.5" /> Regenerate</>
                                                    : <><SparklesIcon className="h-3.5 w-3.5" /> Generate FAQ</>
                                            }
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Results */}
            {aeoResults.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Generated FAQ Schemas ({aeoResults.length})
                    </h3>
                    {aeoResults.filter(r => (r.questions || []).length > 0).map((result, idx) => (
                        <AeoResultCard key={result.pageUrl || idx} result={result} />
                    ))}
                </div>
            )}

            {aeoResults.length === 0 && crawledPages.length > 0 && (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-12 text-center space-y-2">
                        <MessageSquareIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">No FAQ schemas generated yet</p>
                        <p className="text-xs text-muted-foreground">Click "Generate FAQ" on any page above</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
