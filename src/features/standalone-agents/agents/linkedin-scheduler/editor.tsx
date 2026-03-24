/**
 * PostFlow Editor - Main Component
 * LinkedIn Post Scheduler with AI-powered content strategy
 * 5-Step Onboarding Flow + Dashboard
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import type { StandaloneAgentEditorProps } from "../../lib/get-standalone-agent-editor";

// Import onboarding components
import { AccountTypeStep } from "./components/onboarding/AccountTypeStep";
import { DataCollectionStep } from "./components/onboarding/DataCollectionStep";
import { PersonalDataCollectionStep } from "./components/onboarding/PersonalDataCollectionStep";
import { AnalysisIntroStep } from "./components/onboarding/AnalysisIntroStep";
import { DetailedAnalysisStep } from "./components/onboarding/DetailedAnalysisStep";
import { PostTypeSelectionStep } from "./components/onboarding/PostTypeSelectionStep";
import { TimingSuggestionsStep } from "./components/onboarding/TimingSuggestionsStep";
import { ConnectLinkedInStep } from "./components/onboarding/ConnectLinkedInStep";

// Import dashboard components
import { PostFlowDashboard } from "./components/dashboard/PostFlowDashboard";

// Import types
import type {
    CompanyProfile,
    AnalysisResult,
    ContentSuggestion,
    LinkedInPost,
    UserPreferences,
    PostType,
    NavItemId,
    AccountType,
} from "./config";
import { ONBOARDING_STEPS } from "./config";

// State interface
interface PostFlowState {
    // Onboarding
    onboardingStep: number;
    onboardingComplete: boolean;
    accountType: AccountType | null;
    companyProfile: CompanyProfile | null;

    // AI Analysis
    analysisResult: AnalysisResult | null;
    isAnalyzing: boolean;

    // User Preferences (from onboarding)
    userPreferences: UserPreferences | null;
    selectedPostTypes: PostType[];

    // Content
    suggestions: ContentSuggestion[];
    posts: LinkedInPost[];

    // Settings
    ayrshareConnected: boolean;
    ayrshareApiKey: string | null;
    unipileConnected: boolean;

    // UI State
    activeTab: NavItemId;
}

const initialState: PostFlowState = {
    onboardingStep: ONBOARDING_STEPS.ACCOUNT_TYPE,
    onboardingComplete: false,
    accountType: null,
    companyProfile: null,
    analysisResult: null,
    isAnalyzing: false,
    userPreferences: null,
    selectedPostTypes: [],
    suggestions: [],
    posts: [],
    ayrshareConnected: false,
    ayrshareApiKey: null,
    unipileConnected: false,
    activeTab: "dashboard",
};

export default function LinkedInSchedulerEditor(props: StandaloneAgentEditorProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [state, setState] = useState<PostFlowState>(initialState);

    // Load state from agent data
    useEffect(() => {
        const loadState = async () => {
            try {
                const response = await fetch(`/api/standalone-agents/${props.agentId}`);
                if (response.ok) {
                    const agentData = await response.json();
                    const config = agentData.config || {};
                    const data = agentData.data || {};

                    const hasCompanyProfile = !!config.companyProfile?.businessName;
                    const hasOnboardingComplete = !!config.onboardingComplete;
                    const hasAyrshareKey = !!config.ayrshareApiKey;
                    const hasUnipileAccountId = !!config.unipileAccountId;

                    setState((prev) => ({
                        ...prev,
                        onboardingStep: hasOnboardingComplete
                            ? 0
                            : (config.onboardingStep || ONBOARDING_STEPS.ACCOUNT_TYPE),
                        onboardingComplete: hasOnboardingComplete,
                        accountType: config.accountType || null,
                        companyProfile: config.companyProfile || null,
                        analysisResult: data.analysisResult || null,
                        userPreferences: config.userPreferences || null,
                        selectedPostTypes: config.userPreferences?.selectedPostTypes || [],
                        suggestions: data.suggestions || [],
                        posts: data.posts || [],
                        ayrshareConnected: hasAyrshareKey,
                        ayrshareApiKey: config.ayrshareApiKey || null,
                        unipileConnected: hasUnipileAccountId,
                    }));
                }
            } catch (error) {
                console.error("Error loading state:", error);
                toast.error("Failed to load agent data");
            } finally {
                setIsLoading(false);
            }
        };

        loadState();
    }, [props.agentId]);

    // ============================================
    // ONBOARDING STEP HANDLERS
    // ============================================

    // Step 1: Account Type Selection
    const handleAccountTypeSelect = async (accountType: AccountType) => {
        // Save account type to agent config
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { accountType },
            }),
        });

        setState((prev) => ({
            ...prev,
            accountType,
            onboardingStep: ONBOARDING_STEPS.DATA_COLLECTION,
        }));
    };

    // Step 2: Data Collection
    const handleDataCollectionComplete = async (profile: CompanyProfile) => {
        // Save profile to agent config
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { companyProfile: profile },
            }),
        });

        setState((prev) => ({
            ...prev,
            companyProfile: profile,
            onboardingStep: ONBOARDING_STEPS.ANALYSIS_INTRO,
        }));
    };

    // Step 2: Start Analysis
    const handleStartAnalysis = async () => {
        if (!state.companyProfile) return;

        setState((prev) => ({ ...prev, isAnalyzing: true }));

        try {
            // Call Groq-powered analysis API
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyProfile: state.companyProfile,
                    agentId: props.agentId,
                }),
            });

            if (!response.ok) {
                throw new Error("Analysis failed");
            }

            const { analysis } = await response.json();

            setState((prev) => ({
                ...prev,
                analysisResult: analysis,
                onboardingStep: ONBOARDING_STEPS.DETAILED_ANALYSIS,
                isAnalyzing: false,
            }));

            toast.success("Analysis complete!");
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error("Analysis failed. Please try again.");
            setState((prev) => ({ ...prev, isAnalyzing: false }));
        }
    };

    // Step 3: Continue from Detailed Analysis
    const handleAnalysisNext = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.POST_TYPE_SELECTION,
        }));
    };

    // Step 3: Re-analyze
    const handleReanalyze = async () => {
        await handleStartAnalysis();
    };

    // Step 4: Post Type Selection
    const handlePostTypeSelection = (selectedTypes: PostType[]) => {
        setState((prev) => ({
            ...prev,
            selectedPostTypes: selectedTypes,
            onboardingStep: ONBOARDING_STEPS.TIMING_SUGGESTIONS,
        }));
    };

    // Step 4: Back to Analysis
    const handleBackToAnalysis = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.DETAILED_ANALYSIS,
        }));
    };

    // Step 5: Complete Onboarding
    // Step 6: After Timing Suggestions - Move to LinkedIn Connection
    const handleOnboardingComplete = async (preferences: UserPreferences) => {
        // Save preferences first
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { userPreferences: preferences },
            }),
        });

        setState((prev) => ({
            ...prev,
            userPreferences: preferences,
            onboardingStep: ONBOARDING_STEPS.CONNECT_LINKEDIN,
        }));
    };

    // Step 7: Final completion after LinkedIn connection
    const handleFinalOnboardingComplete = async () => {
        setState((prev) => ({ ...prev, isAnalyzing: true }));

        try {
            // Call Groq-powered content generation API
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyProfile: state.companyProfile,
                    selectedPostTypes: state.userPreferences?.selectedPostTypes || state.selectedPostTypes,
                    analysisResult: state.analysisResult,
                    agentId: props.agentId,
                    count: 5,
                }),
            });

            if (!response.ok) {
                throw new Error("Content generation failed");
            }

            const { suggestions } = await response.json();

            // Mark onboarding complete
            await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: { onboardingComplete: true },
                }),
            });

            setState((prev) => ({
                ...prev,
                suggestions,
                onboardingComplete: true,
                onboardingStep: 0,
                isAnalyzing: false,
            }));

            toast.success("Setup complete! Welcome to PostFlow.");
        } catch (error) {
            console.error("Error completing onboarding:", error);
            toast.error("Failed to complete setup");
            setState((prev) => ({ ...prev, isAnalyzing: false }));
        }
    };

    // Back handlers
    const handleBackToAccountType = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.ACCOUNT_TYPE,
        }));
    };

    const handleBackToDataCollection = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.DATA_COLLECTION,
        }));
    };

    const handleBackToPostTypes = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.POST_TYPE_SELECTION,
        }));
    };

    const handleBackToTimingSuggestions = () => {
        setState((prev) => ({
            ...prev,
            onboardingStep: ONBOARDING_STEPS.TIMING_SUGGESTIONS,
        }));
    };

    // ============================================
    // DASHBOARD HANDLERS
    // ============================================

    const handleTabChange = (tab: NavItemId) => {
        setState((prev) => ({ ...prev, activeTab: tab }));
    };

    const handleRunAnalysis = async () => {
        if (!state.companyProfile) return;
        setState((prev) => ({ ...prev, isAnalyzing: true }));

        try {
            // Call Groq-powered analysis API
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyProfile: state.companyProfile,
                    agentId: props.agentId,
                }),
            });

            if (!response.ok) {
                throw new Error("Analysis failed");
            }

            const { analysis } = await response.json();

            setState((prev) => ({
                ...prev,
                analysisResult: analysis,
                isAnalyzing: false,
            }));

            toast.success("Analysis updated!");
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error("Analysis failed");
            setState((prev) => ({ ...prev, isAnalyzing: false }));
        }
    };

    const handleScheduleSuggestion = async (suggestionId: string, scheduledFor: string) => {
        const suggestion = state.suggestions.find((s) => s.id === suggestionId);
        if (!suggestion) return;

        const newPost: LinkedInPost = {
            id: `post-${Date.now()}`,
            content: suggestion.content,
            postType: suggestion.postType,
            category: suggestion.category,
            status: "scheduled",
            scheduledAt: scheduledFor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const updatedPosts = [...state.posts, newPost];
        const updatedSuggestions = state.suggestions.map((s) =>
            s.id === suggestionId ? { ...s, status: "scheduled" as const, scheduledFor } : s
        );

        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: { posts: updatedPosts, suggestions: updatedSuggestions },
            }),
        });

        setState((prev) => ({
            ...prev,
            posts: updatedPosts,
            suggestions: updatedSuggestions,
        }));

        toast.success("Post scheduled!");
    };

    const handleSaveDraft = async (content: string, category: string, imageUrl?: string, postId?: string) => {
        let updatedPosts: LinkedInPost[];

        if (postId) {
            // Update existing draft
            updatedPosts = state.posts.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        content,
                        imageUrl: imageUrl,
                        updatedAt: new Date().toISOString(),
                    }
                    : p
            );
        } else {
            // Create new draft
            const newPost: LinkedInPost = {
                id: `post-${Date.now()}`,
                content,
                postType: "educational",
                category: category as LinkedInPost["category"],
                status: "draft",
                imageUrl: imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            updatedPosts = [...state.posts, newPost];
        }

        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: { posts: updatedPosts },
            }),
        });

        setState((prev) => ({ ...prev, posts: updatedPosts }));
    };

    const handleUpdatePostStatus = async (postId: string, status: LinkedInPost["status"]) => {
        const updatedPosts = state.posts.map((p) =>
            p.id === postId
                ? { ...p, status, updatedAt: new Date().toISOString(), postedAt: status === "posted" ? new Date().toISOString() : p.postedAt }
                : p
        );

        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: { posts: updatedPosts },
            }),
        });

        setState((prev) => ({ ...prev, posts: updatedPosts }));
    };

    const handleDeletePost = async (postId: string) => {
        const updatedPosts = state.posts.filter((p) => p.id !== postId);

        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: { posts: updatedPosts },
            }),
        });

        setState((prev) => ({ ...prev, posts: updatedPosts }));
        toast.success("Post deleted");
    };

    const handleSaveAyrshareKey = async (apiKey: string) => {
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { ayrshareApiKey: apiKey },
            }),
        });

        setState((prev) => ({
            ...prev,
            ayrshareConnected: true,
            ayrshareApiKey: apiKey,
        }));

        toast.success("Ayrshare connected!");
    };

    const handleDisconnectAyrshare = async () => {
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { ayrshareApiKey: null },
            }),
        });

        setState((prev) => ({
            ...prev,
            ayrshareConnected: false,
            ayrshareApiKey: null,
        }));

        toast.success("Ayrshare disconnected");
    };

    const handleUpdateBusinessProfile = async (profile: CompanyProfile) => {
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: { companyProfile: profile },
            }),
        });

        setState((prev) => ({ ...prev, companyProfile: profile }));
        toast.success("Profile updated");
    };

    const handleConnectUnipile = async () => {
        try {
            toast.info("Connecting to LinkedIn...");

            // Save the current step before redirecting so we return to the right place
            await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: { onboardingStep: ONBOARDING_STEPS.CONNECT_LINKEDIN },
                }),
            });

            const response = await fetch(
                `/api/standalone-agents/linkedin-scheduler/unipile/connect?agentId=${props.agentId}`
            );

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.error || "Failed to initiate connection");
                return;
            }

            const data = await response.json();

            if (data.connected) {
                toast.success("LinkedIn already connected!");
                setState((prev) => ({ ...prev, unipileConnected: true }));
                return;
            }

            if (data.connectUrl) {
                // Redirect to Unipile OAuth
                window.location.href = data.connectUrl;
            } else {
                toast.error("Could not get connection URL");
            }
        } catch (error) {
            console.error("Connect error:", error);
            toast.error("Failed to connect LinkedIn");
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Onboarding Flow
    if (!state.onboardingComplete) {
        switch (state.onboardingStep) {
            case ONBOARDING_STEPS.ACCOUNT_TYPE:
                return (
                    <AccountTypeStep
                        onNext={handleAccountTypeSelect}
                        initialType={state.accountType || undefined}
                    />
                );

            case ONBOARDING_STEPS.DATA_COLLECTION:
                if (state.accountType === "personal") {
                    return (
                        <PersonalDataCollectionStep
                            onNext={handleDataCollectionComplete}
                            onBack={handleBackToAccountType}
                            initialData={state.companyProfile || undefined}
                            isLoading={state.isAnalyzing}
                        />
                    );
                }
                return (
                    <DataCollectionStep
                        onNext={handleDataCollectionComplete}
                        onBack={handleBackToAccountType}
                        initialData={state.companyProfile || undefined}
                        isLoading={state.isAnalyzing}
                    />
                );

            case ONBOARDING_STEPS.ANALYSIS_INTRO:
                return (
                    <AnalysisIntroStep
                        companyProfile={state.companyProfile!}
                        onNext={handleStartAnalysis}
                        onBack={handleBackToDataCollection}
                        isLoading={state.isAnalyzing}
                    />
                );

            case ONBOARDING_STEPS.DETAILED_ANALYSIS:
                return (
                    <DetailedAnalysisStep
                        companyProfile={state.companyProfile!}
                        analysis={state.analysisResult!}
                        onNext={handleAnalysisNext}
                        onReanalyze={handleReanalyze}
                        isLoading={state.isAnalyzing}
                    />
                );

            case ONBOARDING_STEPS.POST_TYPE_SELECTION:
                return (
                    <PostTypeSelectionStep
                        analysis={state.analysisResult!}
                        onNext={handlePostTypeSelection}
                        onBack={handleBackToAnalysis}
                        initialSelection={state.selectedPostTypes}
                    />
                );

            case ONBOARDING_STEPS.TIMING_SUGGESTIONS:
                return (
                    <TimingSuggestionsStep
                        analysis={state.analysisResult!}
                        selectedPostTypes={state.selectedPostTypes}
                        onComplete={handleOnboardingComplete}
                        onBack={handleBackToPostTypes}
                        isLoading={state.isAnalyzing}
                    />
                );

            case ONBOARDING_STEPS.CONNECT_LINKEDIN:
                return (
                    <ConnectLinkedInStep
                        onComplete={handleFinalOnboardingComplete}
                        onBack={handleBackToTimingSuggestions}
                        isConnected={state.unipileConnected}
                        onConnect={handleConnectUnipile}
                        isConnecting={state.isAnalyzing}
                    />
                );
        }
    }

    // Dashboard View - ensure we have a company profile
    if (!state.companyProfile) {
        // If profile is missing but onboarding was marked complete, reset to onboarding
        return (
            <DataCollectionStep
                onNext={handleDataCollectionComplete}
                isLoading={state.isAnalyzing}
            />
        );
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden min-w-0 bg-background">
            <PostFlowDashboard
                agentId={props.agentId}
                businessProfile={state.companyProfile}
                aiAnalysis={state.analysisResult}
                suggestions={state.suggestions}
                posts={state.posts}
                activeTab={state.activeTab}
                isAnalyzing={state.isAnalyzing}
                ayrshareConnected={state.ayrshareConnected}
                unipileConnected={state.unipileConnected}
                onTabChange={handleTabChange}
                onRunAnalysis={handleRunAnalysis}
                onScheduleSuggestion={handleScheduleSuggestion}
                onSaveDraft={handleSaveDraft}
                onUpdatePostStatus={handleUpdatePostStatus}
                onDeletePost={handleDeletePost}
                onSaveAyrshareKey={handleSaveAyrshareKey}
                onDisconnectAyrshare={handleDisconnectAyrshare}
                onUpdateBusinessProfile={handleUpdateBusinessProfile}
                onConnectUnipile={handleConnectUnipile}
            />
        </div>
    );
}

