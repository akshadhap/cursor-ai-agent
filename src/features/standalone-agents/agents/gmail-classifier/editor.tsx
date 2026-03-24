/**
 * Main Editor - Redesigned with SpinaBOT UI
 * Uses SpinaBOT's design system throughout
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2Icon, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StandaloneAgentEditorProps } from "../../lib/get-standalone-agent-editor";
import { ActivityLogger } from "@/lib/activity-logger";

// Import components
import { StepProgress } from "./components/StepProgress";
import { EmailProviderStep } from "./components/onboarding/EmailProviderStep";
import { SuccessModal } from "./components/onboarding/SuccessModal";
import { ToolsConnectionStep } from "./components/onboarding/ToolsConnectionStep";
import { KnowledgeBaseStep } from "./components/onboarding/KnowledgeBaseStep";
import { QuizStep, type QuizAnswers } from "./components/onboarding/QuizStep";
import { SetupDashboard } from "./components/onboarding/SetupDashboard";
import { EmailDashboard } from "./components/dashboard/EmailDashboard";

interface OnboardingState {
    currentStep: number;
    emailProvider: "gmail" | "outlook" | "zoho" | null;
    emailConnected: boolean;
    jiraConnected: boolean;
    notionConnected: boolean;
    slackConnected: boolean;
    userEmail: string;
    connectedTools: string[];
    quizAnswers: QuizAnswers | null;
    onboardingComplete: boolean;
    isEditing: boolean;
}

export default function EmailClassifierEditor(props: StandaloneAgentEditorProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [onboarding, setOnboarding] = useState<OnboardingState>({
        currentStep: 6, // Default to Setup Dashboard step index
        emailProvider: null,
        emailConnected: false,
        jiraConnected: false,
        notionConnected: false,
        slackConnected: false,
        userEmail: "",
        connectedTools: [],
        quizAnswers: null,
        onboardingComplete: false,
        isEditing: false,
    });

    // Load onboarding state from agent data
    useEffect(() => {
        const loadOnboardingState = async () => {
            try {
                const response = await fetch(`/api/standalone-agents/${props.agentId}`);
                if (response.ok) {
                    const agentData = await response.json();

                    // Check if we just completed OAuth (from URL parameter)
                    const urlParams = new URLSearchParams(window.location.search);
                    const justConnected = urlParams.has('connected');
                    const jiraConnected = urlParams.has('jira_connected');
                    const notionConnected = urlParams.has('notion_connected');
                    const slackConnected = urlParams.has('success') && urlParams.get('success') === 'slack_connected';

                    const config = agentData.config || {};
                    const hasRealToken = !!config.accessToken;
                    const gmailEmail = config.gmailEmail;
                    const hasJiraToken = !!config.jira?.accessToken;
                    const hasNotionToken = !!config.notion?.accessToken;
                    const hasSlackToken = !!config.slack?.accessToken;

                    console.log("[Editor] Loaded state:", {
                        hasToken: hasRealToken,
                        hasJiraToken,
                        hasNotionToken,
                        hasSlackToken,
                        jiraConfig: agentData.config?.jira,
                        notionConfig: agentData.config?.notion,
                        slackConfig: agentData.config?.slack,
                        email: gmailEmail,
                        justConnected
                    });

                    // Determine initial step based on DB completion status
                    const hasCompletedTools = config.toolsCompleted === true;
                    const hasCompletedKnowledgeBase = config.knowledgeBase?.completed === true;
                    const hasCompletedQuiz = config.quizCompleted === true;
                    const hasCompletedOnboarding = config.onboardingComplete === true;

                    let initialStep = 6; // Default: Setup Dashboard
                    let showOnboarding = true;

                    if (hasCompletedOnboarding) {
                        initialStep = 6;
                        showOnboarding = false;

                        // Show success toasts for any OAuth callbacks
                        if (jiraConnected) setTimeout(() => toast.success("Jira connected successfully!"), 100);
                        if (notionConnected) setTimeout(() => toast.success("Notion connected successfully!"), 100);
                        if (slackConnected) setTimeout(() => toast.success("Slack connected successfully!"), 100);
                        if (justConnected) setTimeout(() => toast.success("Gmail reconnected successfully!"), 100);
                    } else if (justConnected) {
                        initialStep = 2;
                    } else if (jiraConnected || notionConnected || slackConnected) {
                        initialStep = 3;
                    } else if (!hasRealToken) {
                        initialStep = 1;
                    } else if (!hasCompletedTools) {
                        initialStep = 3;
                    } else if (!hasCompletedKnowledgeBase) {
                        initialStep = 4;
                    } else if (!hasCompletedQuiz) {
                        initialStep = 5;
                    } else {
                        initialStep = 6;
                    }

                    setOnboarding((prev) => ({
                        ...prev,
                        emailConnected: hasRealToken,
                        jiraConnected: hasJiraToken,
                        notionConnected: hasNotionToken,
                        slackConnected: hasSlackToken,
                        userEmail: gmailEmail || "",
                        emailProvider: config.emailProvider || "gmail",
                        connectedTools: config.connectedTools || [],
                        quizAnswers: config.preferences || null,
                        currentStep: initialStep,
                        isEditing: showOnboarding,
                    }));

                    // Clean up URL parameters
                    if (justConnected || jiraConnected || notionConnected || slackConnected) {
                        // Only replace if we have these params to avoid clearing other potential params if any
                        // Logic here is fine as is
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                }
            } catch (error) {
                console.error("Error loading state:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadOnboardingState();
    }, [props.agentId]);

    // Handle email provider selection... (unchanged)
    const handleConnectGmail = async () => {
        try {
            const response = await fetch(
                "/api/standalone-agents/gmail-classifier/connect-gmail",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agentId: props.agentId, provider: "gmail" }),
                }
            );

            const data = await response.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (error) {
            toast.error("Failed to initiate connection");
        }
    };

    const handleProviderSelect = async (provider: "gmail" | "outlook" | "zoho") => {
        handleConnectGmail();
    };

    const handleSuccessModalContinue = () => {
        setOnboarding((prev) => ({ ...prev, currentStep: 3 }));
    };

    // Handle tool connection
    const handleToolConnect = async (toolId: string) => {
        if (toolId === 'jira') {
            try {
                const response = await fetch(
                    `/api/standalone-agents/gmail-classifier/connect-jira`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agentId: props.agentId }),
                    }
                );
                const data = await response.json();
                if (data.authUrl) window.location.href = data.authUrl;
                else if (data.error) toast.error(data.error);
            } catch (error) {
                toast.error('Failed to connect Jira');
            }
            return;
        }

        if (toolId === 'notion') {
            try {
                const response = await fetch(
                    `/api/standalone-agents/gmail-classifier/connect-notion`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agentId: props.agentId }),
                    }
                );
                const data = await response.json();
                if (data.authUrl) window.location.href = data.authUrl;
                else if (data.error) toast.error(data.error);
            } catch (error) {
                toast.error('Failed to connect Notion');
            }
            return;
        }

        if (toolId === 'slack') {
            try {
                const response = await fetch(
                    `/api/standalone-agents/gmail-classifier/connect-slack`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agentId: props.agentId }),
                    }
                );
                const data = await response.json();
                if (data.url) window.location.href = data.url; // Note: connect-slack returns { url }, others { authUrl }
                else if (data.error) toast.error(data.error);
            } catch (error) {
                toast.error('Failed to connect Slack');
            }
            return;
        }

        // For other tools
        setOnboarding((prev) => ({
            ...prev,
            connectedTools: [...prev.connectedTools, toolId],
        }));
        toast.success(`${toolId} connected!`);
    };

    // Handle Jira disconnect
    const handleDisconnectJira = async () => {
        try {
            const response = await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        jira: null, // Remove Jira credentials
                        connectedTools: onboarding.connectedTools.filter(t => t !== 'jira'),
                    }
                }),
            });

            if (response.ok) {
                setOnboarding((prev) => ({
                    ...prev,
                    jiraConnected: false,
                    connectedTools: prev.connectedTools.filter(t => t !== 'jira'),
                }));
                toast.success('Jira disconnected successfully');
                ActivityLogger.disconnected(props.agentId, 'jira');
            } else {
                toast.error('Failed to disconnect Jira');
            }
        } catch (error) {
            console.error('Error disconnecting Jira:', error);
            toast.error('Failed to disconnect Jira');
        }
    };

    // Handle Gmail disconnect
    const handleDisconnectGmail = async () => {
        try {
            const response = await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        accessToken: null,
                        refreshToken: null,
                        tokenExpiresAt: null,
                        gmailEmail: null,
                        emailProvider: null,
                    },
                    data: {
                        gmailConnected: false,
                        emails: [], // Optional: clear cached emails? Maybe better to keep them but show disconnected state
                    }
                }),
            });

            if (response.ok) {
                setOnboarding((prev) => ({
                    ...prev,
                    emailConnected: false,
                    userEmail: "",
                    emailProvider: null,
                }));
                toast.success('Gmail disconnected successfully');
                ActivityLogger.disconnected(props.agentId, 'gmail');
            } else {
                toast.error('Failed to disconnect Gmail');
            }
        } catch (error) {
            console.error('Error disconnecting Gmail:', error);
            toast.error('Failed to disconnect Gmail');
        }
    };

    // Handle Notion disconnect
    const handleDisconnectNotion = async () => {
        try {
            const response = await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        notion: null, // Remove Notion credentials
                        connectedTools: onboarding.connectedTools.filter(t => t !== 'notion'),
                    }
                }),
            });

            if (response.ok) {
                setOnboarding((prev) => ({
                    ...prev,
                    notionConnected: false,
                    connectedTools: prev.connectedTools.filter(t => t !== 'notion'),
                }));
                toast.success('Notion disconnected successfully');
                ActivityLogger.disconnected(props.agentId, 'notion');
            } else {
                toast.error('Failed to disconnect Notion');
            }
        } catch (error) {
            console.error('Error disconnecting Notion:', error);
            toast.error('Failed to disconnect Notion');
        }
    };

    // Handle Slack disconnect
    const handleDisconnectSlack = async () => {
        try {
            const response = await fetch(`/api/standalone-agents/${props.agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        slack: null, // Remove Slack credentials
                        connectedTools: onboarding.connectedTools.filter(t => t !== 'slack'),
                    }
                }),
            });

            if (response.ok) {
                setOnboarding((prev) => ({
                    ...prev,
                    slackConnected: false,
                    connectedTools: prev.connectedTools.filter(t => t !== 'slack'),
                }));
                toast.success('Slack disconnected successfully');
                ActivityLogger.disconnected(props.agentId, 'slack');
            } else {
                toast.error('Failed to disconnect Slack');
            }
        } catch (error) {
            console.error('Error disconnecting Slack:', error);
            toast.error('Failed to disconnect Slack');
        }
    };

    // Handle tools step continue
    const handleToolsContinue = async () => {
        // Save tools
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: { connectedTools: onboarding.connectedTools, toolsCompleted: true } }),
        });

        setOnboarding((prev) => ({ ...prev, currentStep: 4 })); // Go to Knowledge Base
    };

    // Handle knowledge base
    const handleKnowledgeBaseContinue = async (data: any) => {
        // Save KB
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                config: {
                    knowledgeBase: { ...data, completed: true, updatedAt: new Date().toISOString() }
                }
            }),
        });
        setOnboarding((prev) => ({ ...prev, currentStep: 5 })); // Go to Quiz
    };

    // Handle quiz
    const handleQuizComplete = async (answers: QuizAnswers) => {
        await fetch(`/api/standalone-agents/${props.agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: { preferences: answers, quizCompleted: true, onboardingComplete: true } }),
        });
        setOnboarding((prev) => ({ ...prev, quizAnswers: answers, currentStep: 6 }));
    };

    // SETUP Dashboard Actions
    const handleOpenDashboard = () => {
        // "Open Dashboard" from Setup just means exit Edit Mode
        setOnboarding((prev) => ({ ...prev, isEditing: false }));
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // MAIN VIEW LOGIC
    if (!onboarding.isEditing) {
        return (
            <div className="h-[calc(100vh-3.5rem)] overflow-hidden min-w-0 relative bg-background">
                <EmailDashboard
                    agentId={props.agentId}
                    isConnected={onboarding.emailConnected}
                    isJiraConnected={onboarding.jiraConnected}
                    isNotionConnected={onboarding.notionConnected}
                    isSlackConnected={onboarding.slackConnected}
                    userEmail={onboarding.userEmail}
                    onConnect={handleConnectGmail}
                    onConnectJira={() => handleToolConnect('jira')}
                    onConnectNotion={() => handleToolConnect('notion')}
                    onConnectSlack={() => handleToolConnect('slack')}
                    onDisconnectJira={handleDisconnectJira}
                    onDisconnectGmail={handleDisconnectGmail}
                    onDisconnectNotion={handleDisconnectNotion}
                    onDisconnectSlack={handleDisconnectSlack}
                    onOpenSettings={() => setOnboarding(prev => ({ ...prev, isEditing: true, currentStep: 6 }))}
                />
            </div>
        );
    }

    // SETUP / ONBOARDING VIEW
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="px-6 py-8 max-w-[1200px] mx-auto">
                    {/* Only show progress if NOT in dashboard view (handled by isEditing check above) */}

                    {/* Back Button to Dashboard */}
                    <div className="mb-6 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOnboarding(prev => ({ ...prev, isEditing: false }))}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Exit Setup
                            <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                        </Button>
                    </div>

                    {/* Step Content */}
                    {onboarding.currentStep === 1 && (
                        <EmailProviderStep onSelect={handleProviderSelect} />
                    )}

                    {onboarding.currentStep === 2 && onboarding.userEmail && (
                        <SuccessModal
                            userEmail={onboarding.userEmail}
                            provider={onboarding.emailProvider || "Gmail"}
                            onContinue={handleSuccessModalContinue}
                        />
                    )}

                    {onboarding.currentStep === 3 && (
                        <ToolsConnectionStep
                            userEmail={onboarding.userEmail}
                            connectedTools={onboarding.connectedTools}
                            onToolConnect={handleToolConnect}
                            onContinue={handleToolsContinue}
                            onBack={() => setOnboarding(prev => ({ ...prev, currentStep: 6 }))}
                        />
                    )}

                    {onboarding.currentStep === 4 && (
                        <KnowledgeBaseStep
                            onContinue={handleKnowledgeBaseContinue}
                            onBack={() => setOnboarding(prev => ({ ...prev, currentStep: 6 }))}
                        />
                    )}

                    {onboarding.currentStep === 5 && (
                        <QuizStep
                            onComplete={handleQuizComplete}
                            onBack={() => setOnboarding(prev => ({ ...prev, currentStep: 6 }))}
                        />
                    )}

                    {onboarding.currentStep === 6 && (
                        <SetupDashboard
                            userEmail={onboarding.userEmail}
                            connectedTools={onboarding.connectedTools}
                            preferences={onboarding.quizAnswers ? {
                                organizationType: onboarding.quizAnswers.organizationType,
                                emailVolume: onboarding.quizAnswers.emailVolume,
                                primaryRole: onboarding.quizAnswers.primaryRole,
                                responseTime: onboarding.quizAnswers.responseTime,
                                primaryPriority: onboarding.quizAnswers.primaryPriority,
                            } : {}}
                            onOpenDashboard={handleOpenDashboard}
                            onManageTools={() => setOnboarding(prev => ({ ...prev, currentStep: 3 }))}
                            onManageKnowledgeBase={() => setOnboarding(prev => ({ ...prev, currentStep: 4 }))}
                            onRetakeQuiz={() => setOnboarding(prev => ({ ...prev, currentStep: 5 }))}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
