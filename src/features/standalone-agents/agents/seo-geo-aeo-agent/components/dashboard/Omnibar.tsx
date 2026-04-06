"use client";

import { useState, useEffect } from "react";
import {
    CommandIcon,
    SearchIcon,
    SparklesIcon,
    ActivityIcon,
    LayoutDashboardIcon,
    ZapIcon,
    BlocksIcon,
    LineChartIcon,
    MessageSquareIcon,
    CheckCircle2Icon,
    XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItemId } from "../../config";

interface OmnibarProps {
    onNavigate: (tab: NavItemId) => void;
    onRunAnalysis: () => void;
}

export function Omnibar({ onNavigate, onRunAnalysis }: OmnibarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [actionResult, setActionResult] = useState<string | null>(null);

    // Cmd+K toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleAction = (actionLabel: string, callback: () => void) => {
        setQuery("");
        setIsThinking(true);
        setTimeout(() => {
            setIsThinking(false);
            setActionResult(`Executed: ${actionLabel}`);
            callback();
            setTimeout(() => {
                setIsOpen(false);
                setActionResult(null);
            }, 1000);
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-background/80 backdrop-blur-sm p-4">
            {/* Click outside to close (simple implementation) */}
            <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />
            
            <div 
                className={cn(
                    "relative z-10 w-full max-w-2xl bg-card border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col",
                    isThinking ? "ring-2 ring-foreground/20 animate-pulse" : ""
                )}
            >
                {/* Input Area */}
                <div className="flex items-center px-4 border-b border-border">
                    {isThinking ? (
                        <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-3" />
                    ) : (
                        <SearchIcon className="w-5 h-5 text-muted-foreground mr-3" />
                    )}
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask the Agent to do anything... (e.g., 'Fix SEO', 'Generate report')"
                        className="flex-1 h-16 bg-transparent outline-none text-foreground text-lg font-medium placeholder:text-muted-foreground/60"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && query.length > 0) {
                                handleAction(`Analyzed request: "${query}"`, onRunAnalysis);
                            }
                        }}
                    />
                    <div className="flex items-center gap-1.5 ml-3">
                        <kbd className="h-6 px-2 flex items-center justify-center rounded bg-muted text-[10px] font-bold font-mono text-muted-foreground">ESC</kbd>
                    </div>
                </div>

                {/* Content Area */}
                {actionResult ? (
                    <div className="p-6 flex items-center gap-3 text-foreground font-semibold bg-muted/20">
                        <CheckCircle2Icon className="w-5 h-5" />
                        {actionResult}
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto w-full pb-4">
                        <div className="px-3 pt-4 pb-2">
                            <p className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                Agent Workflows
                            </p>
                            <button 
                                onClick={() => handleAction("Full Deep Crawl & Analysis", onRunAnalysis)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-left transition-colors"
                            >
                                <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center text-background">
                                    <SparklesIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Run Full Visibility Deep Crawl</p>
                                    <p className="text-xs text-muted-foreground">Audits SEO, GEO, and AEO metrics across the entire domain</p>
                                </div>
                                <span className="ml-auto text-xs text-muted-foreground">↵</span>
                            </button>
                            <button 
                                onClick={() => handleAction("Navigating to Impact Tracker", () => onNavigate("impact-tracker"))}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-left transition-colors mt-1"
                            >
                                <div className="w-8 h-8 rounded-md bg-muted-foreground/20 flex items-center justify-center text-foreground">
                                    <LineChartIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">View Executive ROI Report</p>
                                    <p className="text-xs text-muted-foreground">See the overall business impact of recent agent actions</p>
                                </div>
                            </button>
                        </div>

                        <div className="px-3 pt-2">
                            <p className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                Quick Navigation
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                                <button 
                                    onClick={() => { setIsOpen(false); onNavigate("seo-boost"); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                                >
                                    <ZapIcon className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">SEO Auto-Boost Dashboard</p>
                                </button>
                                <button 
                                    onClick={() => { setIsOpen(false); onNavigate("aeo-generator"); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                                >
                                    <MessageSquareIcon className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">Voice Assistant AEO Generator</p>
                                </button>
                                <button 
                                    onClick={() => { setIsOpen(false); onNavigate("integrations"); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                                >
                                    <BlocksIcon className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">Manage CMS Integrations</p>
                                </button>
                                <button 
                                    onClick={() => { setIsOpen(false); onNavigate("overview"); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                                >
                                    <LayoutDashboardIcon className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">Main Dashboard</p>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="bg-muted/30 px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><ActivityIcon className="w-3 h-3" /> Visibility Agent Online</span>
                    <span className="flex items-center gap-2">
                        Use <kbd className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded">↑</kbd> <kbd className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded">↓</kbd> to navigate
                    </span>
                </div>
            </div>
        </div>
    );
}
