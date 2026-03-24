/**
 * VisibilityAI — Main Editor
 * Handles onboarding flow and dashboard state
 */

"use client";

import { useState, useEffect } from "react";
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

export function VisibilityAIEditor({ agentId, config, data }: VisibilityAIEditorProps) {
    const [isClient, setIsClient] = useState(false);

    // Main State
    const [onboardingComplete, setOnboardingComplete] = useState(!!config?.onboardingComplete);
    const [websiteProfile, setWebsiteProfile] = useState<WebsiteProfile | null>(config?.websiteProfile || null);
    const [analysis, setAnalysis] = useState<VisibilityAnalysis | null>(data?.analysis || null);
    const [activeTab, setActiveTab] = useState<NavItemId>("overview");

    // Crawling state
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlProgress, setCrawlProgress] = useState(0);
    const [crawlStatus, setCrawlStatus] = useState("");
    const [crawlError, setCrawlError] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // --------------------------------------------------------------------------------
    // Core Workflow: Run full analysis (Crawl -> SERP -> Final Analysis)
    // --------------------------------------------------------------------------------
    const runFullAnalysis = async (profile: WebsiteProfile) => {
        setIsCrawling(true);
        setCrawlProgress(0);
        setCrawlStatus("");
        setCrawlError(null);

        try {
            // Step 1: Initialize Crawl
            setCrawlStatus("Crawling website pages...");
            setCrawlProgress(15);
            let crawledPages = [];
            
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
            } catch (crawlErr) {
                console.warn("Crawl failed, using empty pages array", crawlErr);
                // We don't fail completely if crawl fails, we can still analyze the domain conceptually
                // But normally we'd want to stop here or show a specific error
            }

            // Step 2: SERP Data
            setCrawlStatus("Checking real keyword rankings...");
            setCrawlProgress(50);
            let serpKeywords = [];
            
            try {
                const serpRes = await fetch("/api/standalone-agents/seo-geo-aeo/serp-check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ domain: profile.domain, competitors: profile.competitors }),
                });
                
                if (serpRes.ok) {
                    const serpData = await serpRes.json();
                    serpKeywords = serpData.keywords || [];
                }
            } catch (serpErr) {
                console.warn("SERP check failed", serpErr);
            }

            // Step 3: Full AI Analysis
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

            // Update local state
            setAnalysis(analyzeData.analysis);
            setOnboardingComplete(true);

            // Save state to DB
            await saveAgentState(profile, true, analyzeData.analysis);

        } catch (error: any) {
            console.error("Full analysis failed:", error);
            setCrawlError(error.message || "An error occurred during analysis.");
            toast.error("Analysis failed. See details.");
        } finally {
            // We keep isCrawling true if success so it transitions smoothly, 
            // but if error we let them see it and try again.
            // By setting timeout, we give the user a moment to see 100%
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
        toast.info("Running AI Engine Presence Check...");
        
        try {
            const res = await fetch("/api/standalone-agents/seo-geo-aeo/geo-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, profile: websiteProfile, currentAnalysis: analysis }),
            });
            
            if (!res.ok) throw new Error("GEO check failed");
            
            const data = await res.json();
            setAnalysis(data.analysis);
            
            toast.success("GEO Analysis updated!");
        } catch (e: any) {
            console.error(e);
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
            const arrayField = analysis[key as keyof VisibilityAnalysis] as any[];
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
        return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
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
                onTabChange={setActiveTab}
                onRunAnalysis={() => runFullAnalysis(websiteProfile)}
                onRunGeoCheck={handleRunGeoCheck}
                onUpdateProfile={(profile) => {
                    setWebsiteProfile(profile);
                    saveAgentState(profile, onboardingComplete, analysis);
                }}
                onSeoBoostGenerated={(boost) => updateAnalysisItem("seoBoosts", boost)}
                onGeoBoostGenerated={(boost) => updateAnalysisItem("geoBoost", boost, false)}
                onAeoResultAdded={(res) => updateAnalysisItem("aeoResults", res)}
                onBriefAdded={(brief) => updateAnalysisItem("contentBriefs", brief)}
                onSchemaGenerated={(block) => updateAnalysisItem("schemaBlocks", block)}
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
