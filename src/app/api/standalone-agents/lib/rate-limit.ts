// Rate limiting disabled - Upstash Redis not configured
// This is a placeholder to prevent import errors

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

// Null rate limiters - rate limiting is disabled
export const chatRateLimiter = null;
export const summarizeRateLimiter = null;
export const generalRateLimiter = null;

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.reset).toISOString(),
    };
}
