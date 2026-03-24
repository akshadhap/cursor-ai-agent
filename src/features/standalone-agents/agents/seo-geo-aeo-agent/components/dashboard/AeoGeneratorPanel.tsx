/**
 * VisibilityAI — AEO Generator Panel
 * Generate FAQ sections, structured Q&A, and FAQPage schema
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AeoResult, CrawledPage } from "../../config";

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
            {copied ? <CheckIcon className="h-3 w-3 text-green-500" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function AeoResultCard({ result }: { result: AeoResult }) {
    const [showSchema, setShowSchema] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);

    return (
        <Card className="border-border/50 border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <GlobeIcon className="h-4 w-4 text-purple-500" />
                    <span className="font-mono text-xs truncate">{result.pageUrl}</span>
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                        {result.questions.length} questions
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Q&A List */}
                <div className="space-y-2">
                    {result.questions.map(qa => (
                        <div
                            key={qa.id}
                            className="rounded-xl border border-border/50 bg-background overflow-hidden"
                        >
                            <button
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                                onClick={() => setExpandedQ(expandedQ === qa.id ? null : qa.id)}
                            >
                                <p className="text-sm font-medium pr-3">{qa.question}</p>
                                {expandedQ === qa.id
                                    ? <ChevronUpIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    : <ChevronDownIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                }
                            </button>
                            {expandedQ === qa.id && (
                                <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                                    <div className="flex justify-end">
                                        <CopyButton text={`Q: ${qa.question}\nA: ${qa.answer}`} label="Copy Q&A" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Schema Toggle */}
                <div className="space-y-2">
                    <button
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowSchema(e => !e)}
                    >
                        <CodeIcon className="h-3.5 w-3.5 text-purple-500" />
                        FAQPage JSON-LD Schema
                        {showSchema ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                    </button>
                    {showSchema && (
                        <div className="relative">
                            <div className="absolute top-2 right-2 z-10">
                                <CopyButton text={result.faqSchemaFull} label="Copy Schema" />
                            </div>
                            <pre className="p-4 rounded-xl bg-muted/60 border border-border/50 text-xs overflow-x-auto leading-relaxed">
                                <code>{result.faqSchemaFull}</code>
                            </pre>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Generated {new Date(result.generatedAt).toLocaleString()}
                </p>
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
                    <MessageSquareIcon className="h-6 w-6 text-purple-500" />
                    AEO Generator
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Generate FAQ sections and structured Q&A to win featured snippets and voice search
                </p>
            </div>

            {/* How it works */}
            <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <SparklesIcon className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold">How AEO Generator Works</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select any crawled page and our AI extracts question-worthy content, generates clear answers,
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
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            No pages crawled yet. Run an analysis first.
                        </CardContent>
                    </Card>
                ) : (
                    crawledPages.map(page => {
                        const hasResult = existingUrls.has(page.url);
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
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleGenerateFaq(page)}
                                            disabled={!!generatingUrl}
                                            variant={hasResult ? "outline" : "default"}
                                            className={cn(
                                                "gap-2 flex-shrink-0",
                                                !hasResult && "bg-purple-600 hover:bg-purple-700 text-white border-0"
                                            )}
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
                    {aeoResults.map(result => (
                        <AeoResultCard key={result.pageUrl} result={result} />
                    ))}
                </div>
            )}
        </div>
    );
}
