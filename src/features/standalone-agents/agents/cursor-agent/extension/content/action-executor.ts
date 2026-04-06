/// <reference types="vite/client" />
// API executor for Spinabot Cursor AI

// Use a safe way to get environment variables or fallback to localhost
const API_BASE = "http://localhost:3000";
const API_BASE_URL = `${API_BASE}/api/standalone-agents/cursor-agent`;

export interface APIResponse<T = any> {
    success: boolean;
    result?: T;
    action?: string;
    error?: string;
}

/**
 * Call Spinabot API
 */
export async function callAPI<T = any>(
    action: string,
    data: {
        text?: string;
        options?: Record<string, any>;
        [key: string]: any; // Allow additional properties like 'tool'
    }
): Promise<APIResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}/${action}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
            const resetAt = result.resetAt ? new Date(result.resetAt).toLocaleTimeString() : "soon";
            throw new Error(`Rate limit exceeded. Try again at ${resetAt}`);
        }

        // Handle authentication errors
        if (response.status === 401) {
            throw new Error("Please log in to use this feature");
        }

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error(`API call failed for ${action}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "API call failed",
        };
    }
}

/**
 * Log activity to backend for dashboard tracking
 */
async function logActivity(
    type: string,
    details: any,
    url?: string
): Promise<void> {
    try {
        // Get agentId from chrome storage
        const storage = await chrome.storage.local.get(['agentId']);
        const agentId = storage.agentId;

        if (!agentId) {
            console.warn('[Activity Logger] No agentId found, skipping activity log');
            return;
        }

        await fetch(`${API_BASE_URL}/activity`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                agentId,
                type,
                details,
                url: url || window.location.href,
                timestamp: new Date().toISOString(),
            }),
        });

        console.log(`[Activity Logger] Logged ${type} activity`);
    } catch (error) {
        // Don't throw - activity logging is non-critical
        console.error('[Activity Logger] Failed to log activity:', error);
    }
}

/**
 * Chat with AI
 */
export async function chatWithAI(text: string, context?: string): Promise<string> {
    const response = await callAPI<string>("chat", {
        text,
        options: { context },
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to chat with AI");
    }

    // Log activity
    await logActivity('chat', {
        prompt: text,
        context,
        response: response.result,
    });

    return response.result || "";
}





/**
 * Generate task
 */
export async function generateTask(text: string, tool?: string, title?: string, priority?: string): Promise<{
    title: string;
    description: string;
    priority: string;
    syncStatus?: { synced: boolean; message: string };
}> {
    console.log("[Action Executor Debug] generateTask called with tool:", tool);
    const response = await callAPI("generate-task", { text, tool, title, priority });

    if (!response.success) {
        throw new Error(response.error || "Failed to generate task");
    }

    // Log activity
    await logActivity('task', {
        input: text,
        tool,
        result: response.result,
    });

    return { ...response.result, syncStatus: response.result.syncStatus || (response as any).syncStatus };
}

/**
 * Generate email
 */
export async function generateEmail(text: string, tone: string): Promise<{
    subject: string;
    body: string;
}> {
    const response = await callAPI("generate-email", {
        text,
        options: { tone },
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to generate email");
    }

    // Log activity
    await logActivity('email', {
        input: text,
        tone,
        result: response.result,
    });

    return response.result;
}

/**
 * Scrape URL
 */
export async function scrapeURL(url: string): Promise<{
    title: string;
    url: string;
    method: string;
    data: {
        executive_summary: string;
        key_insights: string[];
        structured_data: Record<string, any>;
        sentiment: string;
        category: string;
        trust_score: number;
        fraud_indicators: string[];
        credibility_assessment: string;
        red_flags: string[];
    }
}> {
    const response = await callAPI("scrape", {
        options: { url },
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to scrape URL");
    }

    // Log activity
    await logActivity('scrape', {
        targetUrl: url,
        summary: response.result.data.executive_summary,
    }, url);

    return response.result;
}

/**
 * Enrich data
 */
export async function enrichData(text: string): Promise<{
    name: string;
    role: string;
    company: string;
    location: string;
    website?: string;
    bio: string;
    social_profiles: {
        linkedin?: string;
        twitter?: string;
        github?: string;
        other?: string[];
    };
    keyPoints: string[];
    email?: string;
    linkedin?: string;
    confidence_score?: string;
}> {
    const response = await callAPI("enrich", { text });

    if (!response.success) {
        throw new Error(response.error || "Failed to enrich data");
    }

    // Log activity
    await logActivity('enrich', {
        input: text,
        enrichedData: response.result,
    });

    return response.result;
}

/**
 * Send email via SMTP2GO
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ message: string }> {
    const response = await callAPI("send-email", {
        options: { to, subject, body },
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to send email");
    }

    // Log activity
    await logActivity('email', {
        to,
        subject,
        status: 'sent',
    });

    return response.result;
}
