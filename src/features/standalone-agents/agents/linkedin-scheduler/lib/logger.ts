/**
 * Production-safe logger for LinkedIn Scheduler
 * Only logs in development mode or for errors in production
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
    /**
     * Debug logs - only in development
     */
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Info logs - only in development
     */
    info: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Warn logs - always shown
     */
    warn: (...args: unknown[]) => {
        console.warn(...args);
    },

    /**
     * Error logs - always shown
     */
    error: (...args: unknown[]) => {
        console.error(...args);
    },

    /**
     * Force log - always shown (for critical info even in production)
     */
    force: (...args: unknown[]) => {
        console.log(...args);
    },
};
