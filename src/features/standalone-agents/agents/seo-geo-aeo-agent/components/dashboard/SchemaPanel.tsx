"use client";

/**
 * VisibilityAI — Schema Panel
 * Ready-to-copy JSON-LD: FAQ, Article, HowTo, Organization, BreadcrumbList, WebSite — monochrome
 * Premium Next-Level Aesthetics
 */

import { useState, type ElementType } from "react";
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
    PlusIcon,
    BrainCircuitIcon,
    ChevronDownIcon
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

const schemaTypeConfig: Record<string, { icon: ElementType; label: string; desc: string }> = {
    FAQ:            { icon: HelpCircleIcon,  label: "FAQ",          desc: "FAQPage — for People Also Ask" },
    Article:        { icon: FileTextIcon,    label: "Article",      desc: "Article — for blog posts & news" },
    HowTo:          { icon: ListIcon,        label: "HowTo",        desc: "HowTo — for tutorials & guides" },
    Organization:   { icon: BuildingIcon,    label: "Organization", desc: "Organization — for brand identity" },
    BreadcrumbList: { icon: ListIcon,        label: "Breadcrumbs",  desc: "BreadcrumbList — for nav trails" },
    WebSite:        { icon: GlobeIcon,       label: "WebSite",      desc: "WebSite — search box markup" },
};

function CopyButton({ text, label = "Copy", variant = "ghost" }: { text: string; label?: string; variant?: "ghost" | "secondary" | "outline" }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Schema copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant={variant} size="sm" onClick={handleCopy} className={cn("gap-1.5 text-xs h-8 font-medium", variant === "ghost" && "hover:bg-muted/50")}>
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : label}
        </Button>
    );
}

function SchemaCard({ block }: { block: SchemaBlock }) {
    const cfg = schemaTypeConfig[block.type] || schemaTypeConfig.Organization;
    const [isExpanded, setIsExpanded] = useState(false);

    // Safely format the JSON LD to look beautiful
    const formattedJson = (() => {
        try {
            return JSON.stringify(JSON.parse(block.jsonLd), null, 2);
        } catch {
            return block.jsonLd;
        }
    })();

    const dateLabel = block.generatedAt ? new Date(block.generatedAt).toLocaleString() : "Just now";

    return (
        <Card className="group relative border-border/50 bg-card overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-foreground opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-4 pt-5 px-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center flex-shrink-0 shadow-sm border border-border">
                            <cfg.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-base font-bold tracking-tight">{cfg.label} Schema</p>
                            <p className="text-sm text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md mt-0.5">{block.pageUrl}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CopyButton
                            text={`<script type="application/ld+json">\n${formattedJson}\n</script>`}
                            label="Copy Full <script>"
                            variant="secondary"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/40 backdrop-blur-sm">
                        <span className="text-[11px] font-mono text-muted-foreground font-bold tracking-wider uppercase">application/ld+json</span>
                        <div className="flex items-center gap-2">
                            <CopyButton text={formattedJson} label="Copy Raw JSON" variant="ghost" />
                            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 p-0">
                                <ChevronDownIcon className={cn("h-4 w-4 transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                            </Button>
                        </div>
                    </div>
                    <div className={cn(
                        "transition-all duration-300 relative overflow-hidden",
                        isExpanded ? "max-h-[800px] opacity-100" : "max-h-40 opacity-80"
                    )}>
                        <pre className="p-4 text-xs overflow-x-auto leading-loose font-mono text-foreground/80">
                            <code>{formattedJson}</code>
                        </pre>
                        {/* Fade out bottom if not expanded */}
                        {!isExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    <span>Generated <span className="font-semibold text-foreground/80">{dateLabel}</span> &middot; Inject inside <code className="px-1 py-0.5 rounded bg-muted">{'<head>'}</code></span>
                </div>
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
        <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Elegant Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-border/40">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <CodeIcon className="h-8 w-8 text-muted-foreground" />
                        Schema Blueprint
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Synthesize machine-readable JSON-LD to command rich search results and knowledge panels.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Schema generator Control Panel */}
                <Card className="lg:col-span-5 border-border/50 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-32 bg-foreground/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <CardHeader className="pb-4 relative z-10 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <BrainCircuitIcon className="h-5 w-5 text-foreground" />
                            Configuration Matrix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 relative z-10 flex-1 flex flex-col">
                        
                        {/* Schema type grid */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blueprint Type</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(schemaTypeConfig).map(([type, cfg]) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300",
                                            selectedType === type
                                                ? "border-foreground bg-foreground shadow-md transform scale-[1.02]"
                                                : "border-border/50 hover:border-foreground/40 bg-background/50 backdrop-blur-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                            selectedType === type ? "bg-background shadow-sm" : "bg-muted group-hover:bg-muted/80"
                                        )}>
                                            <cfg.icon className={cn(
                                                "h-4 w-4 transition-colors",
                                                selectedType === type ? "text-foreground" : "text-foreground/70"
                                            )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={cn(
                                                "text-sm font-bold truncate transition-colors",
                                                selectedType === type ? "text-background" : "text-foreground"
                                            )}>{cfg.label}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page selector */}
                        {crawledPages.length > 0 && selectedType !== "Organization" && selectedType !== "WebSite" && (
                            <div className="space-y-2 pt-2 border-t border-border/40">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target URI</label>
                                <div className="relative">
                                    <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <select
                                        value={selectedPage}
                                        onChange={e => setSelectedPage(e.target.value)}
                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background/50 hover:bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground transition-all appearance-none shadow-sm cursor-pointer"
                                    >
                                        {crawledPages.map(p => (
                                            <option key={p.url} value={p.url}>{p.url.replace(/^https?:\/\//, "")}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6">
                            <Button
                                onClick={handleGenerateSchema}
                                disabled={isGenerating}
                                size="lg"
                                className="w-full gap-2 text-sm font-bold shadow-md rounded-xl h-12"
                            >
                                {isGenerating
                                    ? <><Loader2Icon className="h-5 w-5 animate-spin" /> Compiling Structure...</>
                                    : <><PlusIcon className="h-5 w-5" /> Synthesize {selectedType}</>
                                }
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Schema blocks List */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Generated Artifacts ({schemaBlocks.length})
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        {schemaBlocks.length > 0 ? (
                            schemaBlocks.map((block, idx) => (
                                <SchemaCard key={`${block.type}-${block.pageUrl}-${idx}`} block={block} />
                            ))
                        ) : (
                            <Card className="border-border/50 border-dashed bg-transparent shadow-none">
                                <CardContent className="py-20 text-center space-y-4 flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                        <CodeIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-foreground">No Blueprints Synthesized</p>
                                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                            Configure a schema type and target from the matrix to generate structured deployment payloads.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
