/**
 * LinkedIn Safety & Compliance Utilities
 * Hard-coded safety rules to prevent account restrictions
 */

// ============================================
// CONSTANTS
// ============================================

export const DAILY_MESSAGE_LIMIT = 100;
export const MIN_DELAY_SECONDS = 60;
export const MAX_DELAY_SECONDS = 180;

// Rate limit error codes from Unipile
export const RATE_LIMIT_CODES = [429];
export const RESTRICTION_CODES = [403];
export const STOP_CODES = [...RATE_LIMIT_CODES, ...RESTRICTION_CODES];

// ============================================
// TYPES
// ============================================

export interface SafetyConfig {
    dailyMessageCount: number;
    lastMessageDate: string; // ISO date string (YYYY-MM-DD)
    automationPaused: boolean;
    pauseReason?: string;
    automationReplied: string[]; // Chat IDs already replied to
    lastResetTime?: string; // ISO timestamp - only process messages after this time
}

export interface SafetyCheckResult {
    canSend: boolean;
    reason?: string;
    remainingToday: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get a random delay between MIN and MAX seconds
 */
export function getRandomDelay(): number {
    return Math.floor(
        Math.random() * (MAX_DELAY_SECONDS - MIN_DELAY_SECONDS + 1) + MIN_DELAY_SECONDS
    );
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep for a random human-like delay
 */
export async function humanDelay(): Promise<void> {
    const delaySeconds = getRandomDelay();
    console.log(`[Safety] Waiting ${delaySeconds} seconds before next action...`);
    await sleep(delaySeconds * 1000);
}

// ============================================
// SAFETY CHECK FUNCTIONS
// ============================================

/**
 * Initialize safety config with default values
 */
export function initSafetyConfig(existingConfig?: Partial<SafetyConfig>): SafetyConfig {
    return {
        dailyMessageCount: existingConfig?.dailyMessageCount || 0,
        lastMessageDate: existingConfig?.lastMessageDate || getTodayDate(),
        automationPaused: existingConfig?.automationPaused || false,
        pauseReason: existingConfig?.pauseReason,
        automationReplied: existingConfig?.automationReplied || [],
    };
}

/**
 * Check if we can send a message (respects daily limit)
 */
export function canSendMessage(config: SafetyConfig): SafetyCheckResult {
    // Check if automation is paused
    if (config.automationPaused) {
        return {
            canSend: false,
            reason: config.pauseReason || "Automation is paused",
            remainingToday: 0,
        };
    }

    // Check if it's a new day - reset counter
    const today = getTodayDate();
    const isNewDay = config.lastMessageDate !== today;

    const currentCount = isNewDay ? 0 : config.dailyMessageCount;
    const remaining = DAILY_MESSAGE_LIMIT - currentCount;

    if (remaining <= 0) {
        return {
            canSend: false,
            reason: `Daily limit reached (${DAILY_MESSAGE_LIMIT} messages). Resets at midnight.`,
            remainingToday: 0,
        };
    }

    return {
        canSend: true,
        remainingToday: remaining,
    };
}

/**
 * Increment message count after sending
 */
export function incrementMessageCount(config: SafetyConfig): SafetyConfig {
    const today = getTodayDate();
    const isNewDay = config.lastMessageDate !== today;

    return {
        ...config,
        dailyMessageCount: isNewDay ? 1 : config.dailyMessageCount + 1,
        lastMessageDate: today,
    };
}

/**
 * Check if a message is from ourselves (prevent infinite loop)
 */
export function isSelfMessage(senderId: string, ownAccountId: string): boolean {
    if (!senderId || !ownAccountId) return false;
    return senderId === ownAccountId;
}

/**
 * Check if we've already replied to this chat with this rule
 * Uses chat+rule combination to prevent duplicate triggers per rule
 */
export function hasAlreadyReplied(chatId: string, config: SafetyConfig, ruleId?: string): boolean {
    // Check for exact chat+rule combination
    if (ruleId) {
        const key = `${chatId}:${ruleId}`;
        if (config.automationReplied.includes(key)) {
            return true;
        }
    }
    // Also check for legacy chat-only tracking (backwards compatibility)
    return config.automationReplied.includes(chatId);
}

/**
 * Mark a chat+rule as replied to
 * Stores both the chat+rule key and the chat-only key for backwards compatibility
 */
export function markAsReplied(chatId: string, config: SafetyConfig, ruleId?: string): SafetyConfig {
    const newReplied = [...config.automationReplied];

    // Add chat+rule combination
    if (ruleId) {
        const key = `${chatId}:${ruleId}`;
        if (!newReplied.includes(key)) {
            newReplied.push(key);
        }
    }

    // Also add chat-only for backwards compatibility
    if (!newReplied.includes(chatId)) {
        newReplied.push(chatId);
    }

    return {
        ...config,
        automationReplied: newReplied,
    };
}

/**
 * Check if response indicates we should stop automation
 */
export function shouldStopAutomation(response: Response): boolean {
    return STOP_CODES.includes(response.status);
}

/**
 * Pause automation due to rate limit or restriction
 */
export function pauseAutomation(config: SafetyConfig, reason: string): SafetyConfig {
    console.error(`[Safety] ⚠️ Pausing automation: ${reason}`);
    return {
        ...config,
        automationPaused: true,
        pauseReason: reason,
    };
}

/**
 * Resume automation
 */
export function resumeAutomation(config: SafetyConfig): SafetyConfig {
    console.log("[Safety] ✅ Resuming automation");
    return {
        ...config,
        automationPaused: false,
        pauseReason: undefined,
    };
}

/**
 * Handle API response and check for rate limits
 */
export function handleApiResponse(
    response: Response,
    config: SafetyConfig
): { config: SafetyConfig; shouldStop: boolean } {
    if (response.status === 429) {
        return {
            config: pauseAutomation(config, "Rate limit (429) - Too many requests"),
            shouldStop: true,
        };
    }

    if (response.status === 403) {
        return {
            config: pauseAutomation(config, "Access restricted (403) - Account may be limited"),
            shouldStop: true,
        };
    }

    return { config, shouldStop: false };
}

// ============================================
// ANALYTICS HELPERS
// ============================================

export interface DailyStats {
    date: string;
    messagesSent: number;
    repliesReceived: number;
    leadMagnets: number;
}

export interface AnalyticsData {
    totalMessagesSent: number;
    totalRepliesReceived: number;
    leadMagnetsSent: number;
    dailyStats: DailyStats[];
    campaignStats: Record<string, { sent: number; replied: number }>;
}

/**
 * Initialize analytics data
 */
export function initAnalytics(): AnalyticsData {
    return {
        totalMessagesSent: 0,
        totalRepliesReceived: 0,
        leadMagnetsSent: 0,
        dailyStats: [],
        campaignStats: {},
    };
}

/**
 * Update daily stats
 */
export function updateDailyStats(
    analytics: AnalyticsData,
    field: 'messagesSent' | 'repliesReceived' | 'leadMagnets',
    increment: number = 1
): AnalyticsData {
    const today = getTodayDate();
    const existingIndex = analytics.dailyStats.findIndex(s => s.date === today);

    let dailyStats = [...analytics.dailyStats];

    if (existingIndex >= 0) {
        dailyStats[existingIndex] = {
            ...dailyStats[existingIndex],
            [field]: dailyStats[existingIndex][field] + increment,
        };
    } else {
        dailyStats.push({
            date: today,
            messagesSent: field === 'messagesSent' ? increment : 0,
            repliesReceived: field === 'repliesReceived' ? increment : 0,
            leadMagnets: field === 'leadMagnets' ? increment : 0,
        });
    }

    // Keep only last 30 days
    if (dailyStats.length > 30) {
        dailyStats = dailyStats.slice(-30);
    }

    return {
        ...analytics,
        dailyStats,
        totalMessagesSent: analytics.totalMessagesSent + (field === 'messagesSent' ? increment : 0),
        totalRepliesReceived: analytics.totalRepliesReceived + (field === 'repliesReceived' ? increment : 0),
        leadMagnetsSent: analytics.leadMagnetsSent + (field === 'leadMagnets' ? increment : 0),
    };
}

/**
 * Calculate conversion rate
 */
export function getConversionRate(analytics: AnalyticsData): number {
    if (analytics.totalMessagesSent === 0) return 0;
    return Math.round((analytics.totalRepliesReceived / analytics.totalMessagesSent) * 100 * 10) / 10;
}
