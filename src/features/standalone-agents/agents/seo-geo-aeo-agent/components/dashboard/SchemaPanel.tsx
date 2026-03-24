/**
 * VisibilityAI — Schema Panel
 * Ready-to-copy JSON-LD: FAQ, Article, HowTo, Organization, BreadcrumbList, WebSite
 */

"use client";

import { useState } from "react";
import {
    CodeIcon,
    CopyIcon,
    CheckIcon,
    Loader2Icon,
    SparklesIcon,
    GlobeIcon,
    FileTextIcon,
    HelpCircleIcon,
    BuildingIcon,
    ListIcon,
    SearchIcon,
    PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SchemaBlock, CrawledPage, WebsiteProfile } from "../../config";

interface SchemaPanelProps {
    agentId: string;
    crawledPages: CrawledPage[];
    websiteProfile: WebsiteProfile;
    schemaBlocks: SchemaBlock[];
    onSchemaGenerated: (block: SchemaBlock) => void;
}

const schemaTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; desc: string }> = {
    FAQ:            { icon: HelpCircleIcon,  color: "text-purple-500",  bg: "bg-purple-500/10",  label: "FAQ",          desc: "FAQPage — for People Also Ask" },
    Article:        { icon: FileTextIcon,    color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Article",      desc: "Article — for blog posts & news" },
    HowTo:          { icon: ListIcon,        color: "text-orange-500",  bg: "bg-orange-500/10",  label: "HowTo",        desc: "HowTo — for tutorials & guides" },
    Organization:   { icon: BuildingIcon,    color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Organization", desc: "Organization — for brand identity" },
    BreadcrumbList: { icon: ListIcon,        color: "text-cyan-500",    bg: "bg-cyan-500/10",    label: "Breadcrumbs",  desc: "BreadcrumbList — for nav trails" },
    WebSite:        { icon: GlobeIcon,       color: "text-pink-500",    bg: "bg-pink-500/10",    label: "WebSite",      desc: "WebSite — search box markup" },
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Schema copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs h-7">
            {copied ? <CheckIcon className="h-3 w-3 text-green-500" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function SchemaCard({ block }: { block: SchemaBlock }) {
    const cfg = schemaTypeConfig[block.type] || schemaTypeConfig.Organization;
    return (
        <Card className="border-border/50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
                            <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{cfg.label} Schema</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{block.pageUrl}</p>
                        </div>
                    </div>
                    <CopyButton
                        text={`<script type="application/ld+json">\n${block.jsonLd}\n</script>`}
                        label="Copy &lt;script&gt;"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div className="absolute top-2 right-2">
                        <CopyButton text={block.jsonLd} label="Copy JSON" />
                    </div>
                    <pre className="p-4 rounded-xl bg-muted/60 border border-border/50 text-xs overflow-x-auto leading-relaxed max-h-64">
                        <code>{block.jsonLd}</code>
                    </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Generated {new Date(block.generatedAt).toLocaleString()} · Add inside your page's &lt;head&gt; tag
                </p>
            </CardContent>
        </Card>
    );
}

export function SchemaPanel({ agentId, crawledPages, websiteProfile, schemaBlocks, onSchemaGenerated }: SchemaPanelProps) {
    const [selectedType, setSelectedType] = useState<string>("Organization");
    const [selectedPage, setSelectedPage] = useState<string>(crawledPages[0]?.url || "");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateSchema = async () => {
        setIsGenerating(true);
        try {
            const page = crawledPages.find(p => p.url === selectedPage);
            const response = await fetch("/api/standalone-agents/seo-geo-aeo/generate-schema", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    schemaType: selectedType,
                    page: page || null,
                    websiteProfile,
                }),
            });
            if (!response.ok) throw new Error("Schema generation failed");
            const { block } = await response.json();
            onSchemaGenerated(block);
            toast.success(`${selectedType} schema generated!`);
        } catch (error) {
            console.error("[Schema] Error:", error);
            toast.error("Failed to generate schema");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CodeIcon className="h-6 w-6 text-emerald-500" />
                    Schema Markup
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Generate structured data JSON-LD to help search engines understand your content
                </p>
            </div>

            {/* Schema generator */}
            <Card className="border-border/50 border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4 text-emerald-500" />
                        Generate Schema Markup
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Schema type grid */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Schema Type</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(schemaTypeConfig).map(([type, cfg]) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={cn(
                                        "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                                        selectedType === type
                                            ? "border-primary bg-primary/5"
                                            : "border-border/50 hover:border-primary/40"
                                    )}
                                >
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                                        <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">{cfg.label}</p>
                                        <p className="text-xs text-muted-foreground hidden md:block">{cfg.desc.split("—")[1]?.trim()}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Page selector */}
                    {crawledPages.length > 0 && selectedType !== "Organization" && selectedType !== "WebSite" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Target Page</label>
                            <select
                                value={selectedPage}
                                onChange={e => setSelectedPage(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {crawledPages.map(p => (
                                    <option key={p.url} value={p.url}>{p.title || p.url}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <Button
                        onClick={handleGenerateSchema}
                        disabled={isGenerating}
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                    >
                        {isGenerating
                            ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Generating Schema...</>
                            : <><PlusIcon className="h-4 w-4" /> Generate {selectedType} Schema</>
                        }
                    </Button>
                </CardContent>
            </Card>

            {/* Schema blocks */}
            {schemaBlocks.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Generated Schemas ({schemaBlocks.length})
                    </h3>
                    {schemaBlocks.map(block => (
                        <SchemaCard key={`${block.type}-${block.pageUrl}`} block={block} />
                    ))}
                </div>
            ) : (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-12 text-center space-y-2">
                        <CodeIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">No schemas generated yet</p>
                        <p className="text-xs text-muted-foreground">Select a type above and generate your first schema</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
