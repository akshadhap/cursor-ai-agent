/**
 * Trial Period Utilities for PostFlow
 * Manages 5-day trial period for LinkedIn Scheduler agents
 */

export const TRIAL_DAYS = 5;

export interface TrialStatus {
    isActive: boolean;
    daysRemaining: number;
    hoursRemaining: number;
    trialEndsAt: Date | null;
    isExpired: boolean;
    trialStartDate: string | null;
}

/**
 * Calculate trial status from agent config
 */
export function getTrialStatus(config: Record<string, unknown>): TrialStatus {
    const trialStartDate = config.trialStartDate as string | undefined;

    // No trial start date means not connected yet
    if (!trialStartDate) {
        return {
            isActive: false,
            daysRemaining: TRIAL_DAYS,
            hoursRemaining: TRIAL_DAYS * 24,
            trialEndsAt: null,
            isExpired: false,
            trialStartDate: null,
        };
    }

    const startDate = new Date(trialStartDate);
    const trialEndsAt = new Date(startDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    const msRemaining = trialEndsAt.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const isExpired = msRemaining <= 0;

    return {
        isActive: !isExpired,
        daysRemaining,
        hoursRemaining,
        trialEndsAt,
        isExpired,
        trialStartDate,
    };
}

/**
 * Format trial remaining time for display
 */
export function formatTrialRemaining(status: TrialStatus): string {
    if (status.isExpired) {
        return "Trial Expired";
    }

    if (status.daysRemaining > 1) {
        return `${status.daysRemaining} days remaining`;
    } else if (status.daysRemaining === 1) {
        return `${status.hoursRemaining} hours remaining`;
    } else {
        return `${status.hoursRemaining} hours remaining`;
    }
}

/**
 * Get trial banner variant based on status
 */
export function getTrialBannerVariant(status: TrialStatus): "info" | "warning" | "error" {
    if (status.isExpired) return "error";
    if (status.daysRemaining <= 1) return "warning";
    if (status.daysRemaining <= 2) return "warning";
    return "info";
}
