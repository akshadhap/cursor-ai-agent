/**
 * Usage Tracking for Cursor Agent
 * Logs API usage for monitoring and analytics
 */

interface UsageLog {
    timestamp: string;
    userId: string;
    userEmail?: string;
    endpoint: string;
    method: string;
    tokensUsed?: number;
    success: boolean;
    errorMessage?: string;
    duration?: number;
}

class UsageTracker {
    private logs: UsageLog[] = [];
    private readonly maxLogs: number = 10000;

    /**
     * Track API usage
     */
    async track(data: {
        userId: string;
        userEmail?: string;
        endpoint: string;
        method: string;
        tokensUsed?: number;
        success: boolean;
        errorMessage?: string;
        duration?: number;
    }): Promise<void> {
        const log: UsageLog = {
            timestamp: new Date().toISOString(),
            ...data,
        };

        // Add to in-memory logs
        this.logs.push(log);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Log to console in development
        if (process.env.NODE_ENV === "development") {
            console.log(
                `[USAGE] ${log.timestamp} | User: ${log.userEmail || log.userId} | ${log.method} ${log.endpoint} | ` +
                `Success: ${log.success} | Tokens: ${log.tokensUsed || 0}` +
                (log.errorMessage ? ` | Error: ${log.errorMessage}` : "")
            );
        }

        // In production, you could send to analytics service
        // await sendToAnalytics(log);
    }

    /**
     * Get usage stats for a user
     */
    getUserStats(userId: string): {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        totalTokens: number;
        endpoints: Record<string, number>;
    } {
        const userLogs = this.logs.filter((log) => log.userId === userId);

        const stats = {
            totalRequests: userLogs.length,
            successfulRequests: userLogs.filter((log) => log.success).length,
            failedRequests: userLogs.filter((log) => !log.success).length,
            totalTokens: userLogs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0),
            endpoints: {} as Record<string, number>,
        };

        // Count requests per endpoint
        userLogs.forEach((log) => {
            stats.endpoints[log.endpoint] = (stats.endpoints[log.endpoint] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get recent logs
     */
    getRecentLogs(limit: number = 100): UsageLog[] {
        return this.logs.slice(-limit);
    }

    /**
     * Clear old logs
     */
    clearOldLogs(olderThanHours: number = 24): void {
        const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
        this.logs = this.logs.filter(
            (log) => new Date(log.timestamp).getTime() > cutoff
        );
    }
}

// Export singleton instance
export const usageTracker = new UsageTracker();

/**
 * Helper to track API call with timing
 */
export async function trackAPICall<T>(
    userId: string,
    userEmail: string | undefined,
    endpoint: string,
    method: string,
    fn: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();

    try {
        const result = await fn();
        const duration = Date.now() - startTime;

        await usageTracker.track({
            userId,
            userEmail,
            endpoint,
            method,
            success: true,
            duration,
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;

        await usageTracker.track({
            userId,
            userEmail,
            endpoint,
            method,
            success: false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            duration,
        });

        throw error;
    }
}
