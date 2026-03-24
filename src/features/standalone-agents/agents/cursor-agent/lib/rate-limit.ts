/**
 * Rate Limiting for Cursor Agent API
 * Uses in-memory rate limiting (can be upgraded to Redis later)
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number = 100, windowMinutes: number = 1) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMinutes * 60 * 1000;

        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Check if request is allowed
     */
    async limit(identifier: string): Promise<{
        success: boolean;
        limit: number;
        remaining: number;
        reset: number;
    }> {
        const now = Date.now();
        const entry = this.limits.get(identifier);

        // No entry or expired
        if (!entry || now > entry.resetTime) {
            this.limits.set(identifier, {
                count: 1,
                resetTime: now + this.windowMs,
            });

            return {
                success: true,
                limit: this.maxRequests,
                remaining: this.maxRequests - 1,
                reset: now + this.windowMs,
            };
        }

        // Entry exists and not expired
        if (entry.count >= this.maxRequests) {
            return {
                success: false,
                limit: this.maxRequests,
                remaining: 0,
                reset: entry.resetTime,
            };
        }

        // Increment count
        entry.count++;
        this.limits.set(identifier, entry);

        return {
            success: true,
            limit: this.maxRequests,
            remaining: this.maxRequests - entry.count,
            reset: entry.resetTime,
        };
    }

    /**
     * Clean up expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now > entry.resetTime) {
                this.limits.delete(key);
            }
        }
    }

    /**
     * Get current stats for identifier
     */
    getStats(identifier: string): {
        count: number;
        remaining: number;
        reset: number;
    } | null {
        const entry = this.limits.get(identifier);
        if (!entry || Date.now() > entry.resetTime) {
            return null;
        }

        return {
            count: entry.count,
            remaining: this.maxRequests - entry.count,
            reset: entry.resetTime,
        };
    }
}

// Create rate limiter instances
export const apiRateLimiter = new RateLimiter(100, 1); // 100 requests per minute
export const chatRateLimiter = new RateLimiter(50, 1); // 50 chat requests per minute
export const heavyRateLimiter = new RateLimiter(20, 1); // 20 heavy operations per minute

/**
 * Helper to create rate limit response headers
 */
export function createRateLimitHeaders(result: {
    limit: number;
    remaining: number;
    reset: number;
}): Record<string, string> {
    return {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.reset).toISOString(),
    };
}
