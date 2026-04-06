/**
 * VisibilityAI — Main Editor
 * Handles onboarding flow and dashboard state
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { WebsiteSetupStep } from "./components/onboarding/WebsiteSetupStep";
import { CrawlProgressStep } from "./components/onboarding/CrawlProgressStep";
import { VisibilityDashboard } from "./components/dashboard/VisibilityDashboard";

import type {
    WebsiteProfile,
    VisibilityAnalysis,
    NavItemId,
    SeoBoostResult,
    GeoBoostResult,
    AeoResult,
    ContentBrief,
    SchemaBlock,
} from "./config";

interface VisibilityAIEditorProps {
    agentId: string;
    config?: {
        websiteProfile?: WebsiteProfile;
        onboardingComplete?: boolean;
    };
    data?: {
        analysis?: VisibilityAnalysis;
    };
}

/** Ensure the analysis object always has safe array defaults — avoids .map() on undefined crashes */
function normalizeAnalysis(raw: any): VisibilityAnalysis {
    return {
        visibilityScore:  raw?.visibilityScore  ?? 0,
        seoScore:         raw?.seoScore          ?? 0,
        geoScore:         raw?.geoScore          ?? 0,
        aeoScore:         raw?.aeoScore          ?? 0,
        crawledPages:     Array.isArray(raw?.crawledPages)    ? raw.crawledPages    : [],
        seoIssues:        Array.isArray(raw?.seoIssues)       ? raw.seoIssues       : [],
        geoAnalysis:      raw?.geoAnalysis       ?? null,
        aeoResults:       Array.isArray(raw?.aeoResults)      ? raw.aeoResults      : [],
        serpKeywords:     Array.isArray(raw?.serpKeywords)    ? raw.serpKeywords    : [],
        contentBriefs:    Array.isArray(raw?.contentBriefs)   ? raw.contentBriefs   : [],
        schemaBlocks:     Array.isArray(raw?.schemaBlocks)    ? raw.schemaBlocks    : [],
        seoBoosts:        Array.isArray(raw?.seoBoosts)       ? raw.seoBoosts       : [],
        geoBoost:         raw?.geoBoost          ?? null,
        pagesAnalyzed:    raw?.pagesAnalyzed     ?? 0,
        issuesFound:      raw?.issuesFound       ?? 0,
        quickWins:        Array.isArray(raw?.quickWins)       ? raw.quickWins       : [],
        generatedAt:      raw?.generatedAt       ?? new Date().toISOString(),
    };
}

export function VisibilityAIEditor({ agentId, config: propConfig, data: propData }: VisibilityAIEditorProps) {
    const [isClient, setIsClient] = useState(false);
    const [isLoadingAgent, setIsLoadingAgent] = useState(!propConfig); // skip fetch if props already have config

    // Resolved config/data (from props or fetched)
    const [resolvedConfig, setResolvedConfig] = useState(propConfig);
    const [resolvedData, setResolvedData] = useState(propData);

    // Main State — initialised from resolved config/data
    const [onboardingComplete, setOnboardingComplete] = useState(!!resolvedConfig?.onboardingComplete);
    const [websiteProfile, setWebsiteProfile] = useState<WebsiteProfile | null>(resolvedConfig?.websiteProfile || null);
    const [analysis, setAnalysis] = useState<VisibilityAnalysis | null>(
        resolvedData?.analysis ? normalizeAnalysis(resolvedData.analysis) : null
    );
    const [activeTab, setActiveTab] = useState<NavItemId>("overview");

    // Crawling state
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlProgress, setCrawlProgress] = useState(0);
    const [crawlStatus, setCrawlStatus] = useState("");
    const [crawlError, setCrawlError] = useState<string | null>(null);

    // Agent activity log
    const [agentLog, setAgentLog] = useState<string[]>([]);
    const addLog = useCallback((msg: string) => {
        setAgentLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Self-fetch agent config + data from DB when no props were passed
    useEffect(() => {
        if (propConfig) {
            setIsLoadingAgent(false);
            return;
        }
        const fetchAgent = async () => {
            try {
                const res = await fetch(`/api/standalone-agents/${agentId}`);
                if (!res.ok) throw new Error("Failed to load agent");
                const agent = await res.json();
                const fetchedConfig = agent.config || {};
                const fetchedData   = agent.data   || {};
                setResolvedConfig(fetchedConfig);
                setResolvedData(fetchedData);
                setOnboardingComplete(!!fetchedConfig.onboardingComplete);
                setWebsiteProfile(fetchedConfig.websiteProfile || null);
                if (fetchedData.analysis) {
                    setAnalysis(normalizeAnalysis(fetchedData.analysis));
                }
            } catch (err) {
                console.error("[VisibilityAIEditor] Failed to load agent state:", err);
            } finally {
                setIsLoadingAgent(false);
            }
        };
        fetchAgent();
    }, [agentId, propConfig]);

    // --------------------------------------------------------------------------------
    // Core Workflow: Run full analysis (Crawl -> SERP -> Final Analysis)
    // --------------------------------------------------------------------------------
    const runFullAnalysis = async (profile: WebsiteProfile) => {
        setIsCrawling(true);
        setCrawlProgress(0);
        setCrawlStatus("");
        setCrawlError(null);
        setAgentLog([]);

        try {
            // Step 1: Initialize Crawl
            addLog(`Starting full analysis for ${profile.domain}`);
            setCrawlStatus("Crawling website pages...");
            setCrawlProgress(15);
            addLog("Crawling website pages and extracting content...");
            let crawledPages: any[] = [];
            
            try {
                const crawlRes = await fetch("/api/standalone-agents/seo-geo-aeo/crawl", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ domain: profile.domain }),
                });
                
                if (!crawlRes.ok) {
                    throw new Error("Failed to crawl website");
                }
                
                const crawlData = await crawlRes.json();
                crawledPages = crawlData.pages || [];
                addLog(`Crawled ${crawledPages.length} pages from ${profile.domain}`);
            } catch (crawlErr) {
                console.warn("Crawl failed, using empty pages array", crawlErr);
                addLog("Crawl warning: using cached/empty page data");
            }

            // Step 2: SERP Data
            addLog("Checking real keyword rankings via SERP...");
            setCrawlStatus("Checking real keyword rankings...");
            setCrawlProgress(50);
            let serpKeywords: any[] = [];
            
            try {
                const serpRes = await fetch("/api/standalone-agents/seo-geo-aeo/serp-check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ domain: profile.domain, competitors: profile.competitors }),
                });
                
                if (serpRes.ok) {
                    const serpData = await serpRes.json();
                    serpKeywords = serpData.keywords || [];
                    addLog(`Found ${serpKeywords.length} keyword signals from SERP`);
                }
            } catch (serpErr) {
                console.warn("SERP check failed", serpErr);
                addLog("SERP check skipped — continuing with AI analysis");
            }

            // Step 3: Full AI Analysis
            addLog("Running deep AI analysis across SEO, GEO & AEO dimensions...");
            setCrawlStatus("Running comprehensive AI analysis...");
            setCrawlProgress(80);
            
            const analyzeRes = await fetch("/api/standalone-agents/seo-geo-aeo/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    agentId, 
                    profile, 
                    crawledPages,
                    serpKeywords
                }),
            });
            
            if (!analyzeRes.ok) throw new Error("AI Analysis API failed");
            
            const analyzeData = await analyzeRes.json();
            
            setCrawlStatus("Finalizing results...");
            setCrawlProgress(100);

            const normalized = normalizeAnalysis(analyzeData.analysis);
            addLog(`Analysis complete — visibility score: ${normalized.visibilityScore}/100`);
            addLog(`Found ${normalized.seoIssues?.length || 0} SEO issues across ${normalized.pagesAnalyzed} pages`);
            if (normalized.geoAnalysis) {
                addLog(`GEO score: ${normalized.geoScore}/100 — ${normalized.geoAnalysis.aiPresenceCheck?.length || 0} AI presence checks run`);
            }
            addLog(`Generated ${normalized.quickWins?.length || 0} quick win recommendations`);
            setAnalysis(normalized);
            setOnboardingComplete(true);

            // Save state to DB
            await saveAgentState(profile, true, normalized);
            addLog("Agent state saved to database ✓");

        } catch (error: any) {
            console.error("Full analysis failed:", error);
            addLog(`Error: ${error.message}`);
            setCrawlError(error.message || "An error occurred during analysis.");
            toast.error("Analysis failed. See details.");
        } finally {
            setTimeout(() => {
                setIsCrawling(false);
            }, 1500);
        }
    };

    const handleProfileSubmit = (profile: WebsiteProfile) => {
        setWebsiteProfile(profile);
        runFullAnalysis(profile);
    };

    // --------------------------------------------------------------------------------
    // GEO Check Explicit Trigger
    // --------------------------------------------------------------------------------
    const handleRunGeoCheck = async () => {
        if (!websiteProfile || !analysis) return;
        
        setIsCrawling(true);
        addLog("Starting dedicated GEO / AI Engine Presence Check...");
        toast.info("Running AI Engine Presence Check...");
        
        try {
            const res = await fetch("/api/standalone-agents/seo-geo-aeo/geo-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, profile: websiteProfile, currentAnalysis: analysis }),
            });
            
            if (!res.ok) throw new Error("GEO check failed");
            
            const d = await res.json();
            const updated = normalizeAnalysis(d.analysis);
            setAnalysis(updated);
            addLog(`GEO check complete — AI mention score: ${updated.geoAnalysis?.aiMentionScore ?? "N/A"}/100`);
            toast.success("GEO Analysis updated!");
        } catch (e: any) {
            console.error(e);
            addLog(`GEO check error: ${e.message}`);
            toast.error("GEO check failed");
        } finally {
            setIsCrawling(false);
        }
    };

    // --------------------------------------------------------------------------------
    // Item Add Handlers (Boosts, Briefs, Schema)
    // --------------------------------------------------------------------------------
    const saveAgentState = async (profile: WebsiteProfile | null, onboardComplete: boolean, analyzerData: VisibilityAnalysis | null) => {
        try {
            await fetch(`/api/standalone-agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: {
                        websiteProfile: profile,
                        onboardingComplete: onboardComplete,
                    },
                    data: {
                        analysis: analyzerData,
                    }
                }),
            });
        } catch (e) {
            console.error("Failed to save state to db:", e);
        }
    };

    const updateAnalysisItem = <K extends keyof VisibilityAnalysis>(key: K, newItem: any, isArray: boolean = true) => {
        if (!analysis) return;
        
        let updatedAnalysis: VisibilityAnalysis;
        
        if (isArray) {
            const arrayField = (analysis[key as keyof VisibilityAnalysis] as any[]) || [];
            updatedAnalysis = {
                ...analysis,
                [key]: [...arrayField, newItem]
            };
        } else {
            updatedAnalysis = {
                ...analysis,
                [key]: newItem
            };
        }
        
        setAnalysis(updatedAnalysis);
        saveAgentState(websiteProfile, onboardingComplete, updatedAnalysis);
    };

    // Prevent hydration errors
    if (!isClient) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
    }

    // Waiting for agent config to be fetched from DB
    if (isLoadingAgent) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading VisibilityAI...</p>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------------
    
    // Showing Crawl Progress (Step 2)
    if (isCrawling || (websiteProfile && !onboardingComplete && !analysis)) {
        return (
            <CrawlProgressStep
                websiteProfile={websiteProfile!}
                progress={crawlProgress}
                status={crawlStatus}
                isComplete={crawlProgress === 100}
                error={crawlError || undefined}
            />
        );
    }
    
    // Fully Onboarded - Show Dashboard
    if (onboardingComplete && websiteProfile && analysis) {
        return (
            <VisibilityDashboard
                agentId={agentId}
                websiteProfile={websiteProfile}
                analysis={analysis}
                activeTab={activeTab}
                isAnalyzing={isCrawling}
                agentLog={agentLog}
                onTabChange={setActiveTab}
                onRunAnalysis={() => runFullAnalysis(websiteProfile)}
                onRunGeoCheck={handleRunGeoCheck}
                onUpdateProfile={(profile) => {
                    setWebsiteProfile(profile);
                    saveAgentState(profile, onboardingComplete, analysis);
                }}
                onSeoBoostGenerated={(boost) => {
                    addLog(`SEO boost generated for ${boost.url}`);
                    updateAnalysisItem("seoBoosts", boost);
                }}
                onGeoBoostGenerated={(boost) => {
                    addLog("GEO boost content generated successfully");
                    updateAnalysisItem("geoBoost", boost, false);
                }}
                onAeoResultAdded={(res) => {
                    addLog(`AEO FAQ schema generated for ${res.pageUrl} — ${res.questions.length} Q&As`);
                    updateAnalysisItem("aeoResults", res);
                }}
                onBriefAdded={(brief) => {
                    addLog(`Content brief generated for keyword: "${brief.keyword}"`);
                    updateAnalysisItem("contentBriefs", brief);
                }}
                onSchemaGenerated={(block) => {
                    addLog(`${block.type} schema markup generated for ${block.pageUrl}`);
                    updateAnalysisItem("schemaBlocks", block);
                }}
            />
        );
    }
    
    // Not onboarded - Show Step 1
    return (
        <WebsiteSetupStep 
            onNext={handleProfileSubmit} 
            initialData={websiteProfile || undefined}
            isLoading={isCrawling}
        />
    );
}
