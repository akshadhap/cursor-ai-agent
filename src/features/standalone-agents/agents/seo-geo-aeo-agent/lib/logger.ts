/**
 * VisibilityAI — Logger
 * Same pattern as linkedin-scheduler/lib/logger.ts
 */

export const logger = {
    info: (message: string, ...args: unknown[]) => {
        console.log(`[VisibilityAI] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
        console.warn(`[VisibilityAI] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
        console.error(`[VisibilityAI] ${message}`, ...args);
    },
};
