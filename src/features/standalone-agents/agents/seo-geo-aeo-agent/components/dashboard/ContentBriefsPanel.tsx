/**
 * VisibilityAI — Content Briefs Panel
 * Keyword gap analysis and AI-generated blog topic briefs — monochrome
 */

"use client";

import { useState } from "react";
import {
    FileTextIcon,
    SparklesIcon,
    Loader2Icon,
    CopyIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    SearchIcon,
    TrendingUpIcon,
    ZapIcon,
    TargetIcon,
    BrainCircuitIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ContentBrief, SerpKeyword } from "../../config";

interface ContentBriefsPanelProps {
    agentId: string;
    contentBriefs: ContentBrief[];
    serpKeywords: SerpKeyword[];
    onBriefAdded: (brief: ContentBrief) => void;
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

const difficultyConfig = {
    easy:   { label: "Easy",   classes: "bg-muted text-foreground border border-border" },
    medium: { label: "Medium", classes: "bg-foreground/10 text-foreground border border-foreground/20" },
    hard:   { label: "Hard",   classes: "bg-foreground text-background border border-foreground" },
};

const intentConfig = {
    informational: { label: "Informational", classes: "bg-muted/50 text-muted-foreground" },
    commercial:    { label: "Commercial",    classes: "bg-muted/70 text-foreground" },
    transactional: { label: "Transactional", classes: "bg-foreground/10 text-foreground" },
    navigational:  { label: "Navigational",  classes: "bg-muted/50 text-muted-foreground" },
};

function BriefCard({ brief }: { brief: ContentBrief }) {
    const [expanded, setExpanded] = useState(false);

    const fullContent = `# ${brief.title}

**Target Keyword:** ${brief.keyword}
**Word Count Target:** ${brief.wordCountTarget} words
**Intent:** ${brief.intent}

## Outline
${(brief.outline || []).map((item, i) => `${i + 1}. ${item}`).join('\n')}

## Target Keywords
${(brief.targetKeywords || []).join(', ')}

## Suggested FAQs
${(brief.suggestedFaqs || []).map(q => `- ${q}`).join('\n')}`;

    const diff = difficultyConfig[brief.difficulty] || difficultyConfig.medium;
    const intent = intentConfig[brief.intent] || intentConfig.informational;

    return (
        <Card className="border-border/50 hover:border-foreground/30 transition-all">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold leading-snug">{brief.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">{brief.keyword || "General"}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", diff.classes)}>
                                {diff.label}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", intent.classes)}>
                                {intent.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{brief.wordCountTarget ? `${brief.wordCountTarget} words` : "Length N/A"}</span>
                            <span className="text-xs text-muted-foreground">Vol: {brief.searchVolume || "Unknown"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <CopyButton text={fullContent} label="Copy Brief" />
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                        >
                            {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {expanded && (
                    <div className="pt-2 border-t border-border/50 space-y-4">
                        {/* Outline */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content Outline</p>
                            <ol className="space-y-1">
                                {(brief.outline || []).map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-xs text-muted-foreground w-5 flex-shrink-0 mt-0.5">{idx + 1}.</span>
                                        {item}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Target Keywords */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Keywords</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(brief.targetKeywords || []).map((kw, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Suggested FAQs */}
                        {(brief.suggestedFaqs || []).length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested FAQs to Answer</p>
                                <div className="space-y-1">
                                    {(brief.suggestedFaqs || []).map((q, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <SearchIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                            {q}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ContentBriefsPanel({ agentId, contentBriefs, serpKeywords, onBriefAdded }: ContentBriefsPanelProps) {
    const [customKeyword, setCustomKeyword] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingKw, setGeneratingKw] = useState<string | null>(null);

    const handleGenerateBrief = async (keyword: string) => {
        if (!keyword.trim()) return;
        setIsGenerating(true);
        setGeneratingKw(keyword);
        try {
            const response = await fetch("/api/standalone-agents/seo-geo-aeo/generate-brief", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, keyword: keyword.trim() }),
            });
            if (!response.ok) throw new Error("Brief generation failed");
            const { brief } = await response.json();
            onBriefAdded(brief);
            setCustomKeyword("");
            toast.success(`Content brief generated for "${keyword}"`);
        } catch (error) {
            console.error("[Brief] Error:", error);
            toast.error("Failed to generate brief");
        } finally {
            setIsGenerating(false);
            setGeneratingKw(null);
        }
    };

    const rankingKeywords = serpKeywords.filter(k => k.position !== null && k.position > 10);
    const missingKeywords  = serpKeywords.filter(k => k.position === null);

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <FileTextIcon className="h-4 w-4 text-background" />
                    </div>
                    Content Briefs
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Agent-generated content briefs based on keyword gaps and competitor analysis
                </p>
            </div>

            {/* Custom keyword input */}
            <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                        <BrainCircuitIcon className="h-4 w-4 text-foreground" />
                        Generate a Brief for Any Keyword
                    </p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="e.g. best project management software"
                                value={customKeyword}
                                onChange={e => setCustomKeyword(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleGenerateBrief(customKeyword)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            onClick={() => handleGenerateBrief(customKeyword)}
                            disabled={!customKeyword.trim() || isGenerating}
                            className="gap-2"
                        >
                            {isGenerating && generatingKw === customKeyword
                                ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Generating...</>
                                : <><ZapIcon className="h-4 w-4" /> Generate</>
                            }
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* SERP Keyword Gaps */}
            {(rankingKeywords.length > 0 || missingKeywords.length > 0) && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUpIcon className="h-4 w-4 text-foreground" />
                            Keyword Opportunities
                            <span className="text-xs font-normal text-muted-foreground ml-1">from SERP analysis</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Ranking but low */}
                            {rankingKeywords.slice(0, 5).map(kw => (
                                <div key={kw.keyword} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{kw.keyword}</p>
                                        <p className="text-xs text-muted-foreground">Position #{kw.position} · Vol: {kw.searchVolume}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isGenerating}
                                        onClick={() => handleGenerateBrief(kw.keyword)}
                                        className="gap-1 text-xs flex-shrink-0 h-7"
                                    >
                                        {generatingKw === kw.keyword
                                            ? <Loader2Icon className="h-3 w-3 animate-spin" />
                                            : <FileTextIcon className="h-3 w-3" />
                                        }
                                        Brief
                                    </Button>
                                </div>
                            ))}

                            {/* Not ranking */}
                            {missingKeywords.slice(0, 5).map(kw => (
                                <div key={kw.keyword} className="flex items-center justify-between p-3 rounded-xl border border-border bg-foreground/5 gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{kw.keyword}</p>
                                        <p className="text-xs text-muted-foreground">Not ranking · Vol: {kw.searchVolume}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isGenerating}
                                        onClick={() => handleGenerateBrief(kw.keyword)}
                                        className="gap-1 text-xs flex-shrink-0 h-7"
                                    >
                                        {generatingKw === kw.keyword
                                            ? <Loader2Icon className="h-3 w-3 animate-spin" />
                                            : <TargetIcon className="h-3 w-3" />
                                        }
                                        Target
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Generated Briefs */}
            {contentBriefs.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Generated Briefs ({contentBriefs.length})
                    </h3>
                    {contentBriefs.map(brief => (
                        <BriefCard key={brief.id} brief={brief} />
                    ))}
                </div>
            ) : (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-12 text-center space-y-2">
                        <FileTextIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">No content briefs yet</p>
                        <p className="text-xs text-muted-foreground">Enter a keyword above or click "Brief" on any keyword opportunity</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
