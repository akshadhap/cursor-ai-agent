/**
 * CursorAI Agent Editor - Complete Onboarding Flow
 * Follows Gmail/LinkedIn agent pattern with multi-step onboarding
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2Icon, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StandaloneAgentEditorProps } from "../../lib/get-standalone-agent-editor";

// Import onboarding components
import { WelcomeStep } from "./components/onboarding/WelcomeStep";
import { ConfigureCapabilitiesStep } from "./components/onboarding/ConfigureCapabilitiesStep";
import { IntegrationsStep } from "./components/onboarding/IntegrationsStep";
import { SetupDashboard } from "./components/onboarding/SetupDashboard";

// Import enhanced dashboard
import { EnhancedCursorAgentDashboard } from "./components/dashboard/EnhancedDashboard";

interface OnboardingState {
    currentStep: number;
    onboardingComplete: boolean;
    capabilities: Record<string, boolean>;
    isEditing: boolean;
}

const ONBOARDING_STEPS = {
    WELCOME: 1,
    CONFIGURE_CAPABILITIES: 2,
    INTEGRATIONS: 3,
    SETUP_DASHBOARD: 4,
};

export default function CursorAgentEditor(props: StandaloneAgentEditorProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [onboarding, setOnboarding] = useState<OnboardingState>({
        currentStep: ONBOARDING_STEPS.WELCOME,
        onboardingComplete: false,
        capabilities: {
            chat: true,
            ask_ai: true,
            tasks: true,
            email: true,
            scraping: true,
            enrichment: true,
        },
        isEditing: false,
    });

    // Load onboarding state from DB
    useEffect(() => {
        const loadOnboardingState = async () => {
            try {
                const response = await fetch(`/api/standalone-agents/${props.agentId}`);
                if (response.ok) {
                    const agentData = await response.json();
                    const config = agentData.config || {};

                    const hasCompletedOnboarding = config.onboardingComplete === true;
                    const savedCapabilities = config.capabilities || {};

                    setOnboarding({
                        currentStep: hasCompletedOnboarding
                            ? ONBOARDING_STEPS.SETUP_DASHBOARD
                            : ONBOARDING_STEPS.WELCOME,
                        onboardingComplete: hasCompletedOnboarding,
                        capabilities: Object.keys(savedCapabilities).length > 0
                            ? savedCapabilities
                            : onboarding.capabilities,
                        isEditing: !hasCompletedOnboarding,
                    });
                }
            } catch (error) {
                console.error("Error loading state:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadOnboardingState();
    }, [props.agentId]);

    // Navigation handlers
    const handleWelcomeContinue = () => {
        setOnboarding((prev) => ({ ...prev, currentStep: ONBOARDING_STEPS.CONFIGURE_CAPABILITIES }));
    };

    const handleConfigureComplete = () => {
        setOnboarding((prev) => ({
            ...prev,
            currentStep: ONBOARDING_STEPS.INTEGRATIONS,
        }));
    };

    const handleConfigureBack = () => {
        setOnboarding((prev) => ({ ...prev, currentStep: ONBOARDING_STEPS.WELCOME }));
    };

    const handleIntegrationsComplete = () => {
        setOnboarding((prev) => ({
            ...prev,
            currentStep: ONBOARDING_STEPS.SETUP_DASHBOARD,
            onboardingComplete: true,
        }));
    };

    const handleIntegrationsBack = () => {
        setOnboarding((prev) => ({ ...prev, currentStep: ONBOARDING_STEPS.CONFIGURE_CAPABILITIES }));
    };

    const handleOpenDashboard = () => {
        setOnboarding((prev) => ({ ...prev, isEditing: false }));
    };

    const handleManageCapabilities = () => {
        setOnboarding((prev) => ({ ...prev, currentStep: ONBOARDING_STEPS.CONFIGURE_CAPABILITIES }));
    };

    const handleOpenSettings = () => {
        setOnboarding((prev) => ({ ...prev, isEditing: true, currentStep: ONBOARDING_STEPS.SETUP_DASHBOARD }));
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // MAIN VIEW LOGIC - Show Enhanced Dashboard if onboarding complete and not editing
    if (onboarding.onboardingComplete && !onboarding.isEditing) {
        return (
            <div className="h-[calc(100vh-3.5rem)] overflow-hidden min-w-0 relative bg-background">
                <EnhancedCursorAgentDashboard
                    agentId={props.agentId}
                    capabilities={onboarding.capabilities}
                    onOpenSettings={handleOpenSettings}
                />
            </div>
        );
    }

    // SETUP / ONBOARDING VIEW
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="px-6 py-8 max-w-[1200px] mx-auto">
                    {/* Exit Setup Button (only show if onboarding complete) */}
                    {onboarding.onboardingComplete && (
                        <div className="mb-6 flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleOpenDashboard}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Exit Setup
                                <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                            </Button>
                        </div>
                    )}

                    {/* Step Content */}
                    {onboarding.currentStep === ONBOARDING_STEPS.WELCOME && (
                        <WelcomeStep onNext={handleWelcomeContinue} />
                    )}

                    {onboarding.currentStep === ONBOARDING_STEPS.CONFIGURE_CAPABILITIES && (
                        <ConfigureCapabilitiesStep
                            agentId={props.agentId}
                            onComplete={handleConfigureComplete}
                            onBack={handleConfigureBack}
                        />
                    )}

                    {onboarding.currentStep === ONBOARDING_STEPS.INTEGRATIONS && (
                        <IntegrationsStep
                            agentId={props.agentId}
                            onComplete={handleIntegrationsComplete}
                            onBack={handleIntegrationsBack}
                        />
                    )}

                    {onboarding.currentStep === ONBOARDING_STEPS.SETUP_DASHBOARD && (
                        <SetupDashboard
                            capabilities={onboarding.capabilities}
                            onOpenDashboard={handleOpenDashboard}
                            onManageCapabilities={handleManageCapabilities}
                            onRebuildExtension={() => { }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
