/**
 * Professional error handling for Cursor Agent
 * Ensures users see friendly messages, not technical backend errors
 */

/**
 * User-friendly error messages mapped from technical errors
 */
const ERROR_MESSAGES: Record<string, string> = {
    // Authentication errors
    "Unauthorized": "Please sign in to continue",
    "Agent not found or unauthorized": "Unable to access this feature. Please try refreshing the page.",

    // Connection errors
    "Failed to connect": "We're having trouble connecting. Please check your internet connection.",
    "Network request failed": "Connection issue. Please try again.",
    "Failed to fetch": "Unable to reach the server. Please try again later.",

    // AI/API errors
    "Failed to generate chat response": "Unable to process your request. Please try again.",
    "Failed to summarize text": "Summarization unavailable. Please try again later.",
    "Failed to translate text": "Translation service temporarily unavailable.",
    "Failed to explain text": "Unable to generate explanation. Please try again.",
    "Failed to rewrite text": "Text rewriting unavailable. Please try again.",

    // Rate limiting
    "Rate limit exceeded": "You've reached the usage limit. Please wait a moment and try again.",

    // Data errors
    "No activities to export": "No activity data available to export yet.",

    // Generic errors
    "Internal server error": "Something went wrong on our end. We're working on it.",
    "Service unavailable": "Service temporarily unavailable. Please try again shortly.",
};

/**
 * Convert technical error to user-friendly message
 * Logs detailed error for developers, returns friendly message for users
 */
export function getFriendlyErrorMessage(error: unknown): string {
    // Log the actual error for developers (console only, not shown to user)
    if (process.env.NODE_ENV === "development") {
        console.error("[Cursor Agent Error]:", error);
    }

    // Get error message
    let errorMessage = "";

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === "string") {
        errorMessage = error;
    } else {
        errorMessage = "Unknown error";
    }

    // Check for exact matches
    if (ERROR_MESSAGES[errorMessage]) {
        return ERROR_MESSAGES[errorMessage];
    }

    // Check for partial matches (case-insensitive)
    const lowerMessage = errorMessage.toLowerCase();

    for (const [technicalError, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
        if (lowerMessage.includes(technicalError.toLowerCase())) {
            return friendlyMessage;
        }
    }

    // Generic fallback - never expose technical details
    return "Something went wrong. Please try again or contact support if the issue persists.";
}

/**
 * Handle API response errors professionally
 */
export function handleAPIError(response: Response, defaultMessage: string = "Request failed"): string {
    // Log for developers
    if (process.env.NODE_ENV === "development") {
        console.error(`[API Error] ${response.status} ${response.statusText}`);
    }

    // Return user-friendly messages based on status code
    switch (response.status) {
        case 400:
            return "Invalid request. Please check your input and try again.";
        case 401:
            return "Please sign in to continue.";
        case 403:
            return "You don't have permission to perform this action.";
        case 404:
            return "The requested resource was not found.";
        case 429:
            return "Too many requests. Please wait a moment and try again.";
        case 500:
        case 502:
        case 503:
        case 504:
            return "Our service is temporarily unavailable. Please try again shortly.";
        default:
            return "Something went wrong. Please try again later.";
    }
}

/**
 * Wrap async operations with professional error handling
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    userFacingOperation: string = "operation"
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const data = await operation();
        return { success: true, data };
    } catch (error) {
        const friendlyMessage = getFriendlyErrorMessage(error);

        // Log for developers
        if (process.env.NODE_ENV === "development") {
            console.error(`[${userFacingOperation} failed]:`, error);
        }

        return { success: false, error: friendlyMessage };
    }
}

/**
 * Format connection status messages
 */
export const CONNECTION_MESSAGES = {
    checking: "Checking connection...",
    connected: "Connected",
    disconnected: "Connection unavailable. Please check your internet connection.",
    error: "Unable to connect. Please try again later.",
} as const;

/**
 * Check if error is a network error (vs business logic error)
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("network") ||
            message.includes("fetch") ||
            message.includes("connection") ||
            message.includes("timeout") ||
            message.includes("cors")
        );
    }
    return false;
}
