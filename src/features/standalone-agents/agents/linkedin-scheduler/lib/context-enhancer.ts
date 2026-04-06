/**
 * Context Aggregator & AI Response Enhancer
 * Collects user context and personalizes automated responses
 * Uses OpenRouter for AI capabilities
 */

import type { CompanyProfile } from "../config";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserContext {
    businessName: string;
    industry: string;
    services: string[];
    targetAudience: string;
    valueProposition: string;
    websiteUrl: string;
    calendarLink: string;
    leadMagnetUrl: string;
    contentTone: string;
}

export interface InteractionContext {
    senderFirstName: string;
    senderLastName?: string;
    senderHeadline?: string;
    senderCompany?: string;
    messageContent: string;
    conversationHistory?: string[];
    postContent?: string;
    mentionedKeywords: string[];
    detectedIntent?: string;
}

export interface TemplateVariables {
    // User context
    businessName: string;
    industry: string;
    services: string;
    targetAudience: string;
    valueProposition: string;
    websiteUrl: string;
    calendarLink: string;
    leadMagnetUrl: string;

    // Interaction context
    firstName: string;
    lastName: string;
    senderHeadline: string;
    senderCompany: string;
    messagePreview: string;
}

// ============================================
// CONTEXT AGGREGATOR
// ============================================

export function aggregateUserContext(profile: CompanyProfile): UserContext {
    return {
        businessName: profile.businessName || "",
        industry: profile.industry || "",
        services: profile.productsServices || [],
        targetAudience: profile.targetAudience || "",
        valueProposition: profile.valueProposition || profile.description || "",
        websiteUrl: profile.websiteUrl || "",
        calendarLink: profile.calendarLink || "",
        leadMagnetUrl: profile.leadMagnetUrl || "",
        contentTone: profile.contentTone || "professional",
    };
}

export function buildTemplateVariables(
    userCtx: UserContext,
    interactionCtx: InteractionContext
): TemplateVariables {
    return {
        // User context
        businessName: userCtx.businessName,
        industry: userCtx.industry,
        services: userCtx.services.join(", "),
        targetAudience: userCtx.targetAudience,
        valueProposition: userCtx.valueProposition,
        websiteUrl: userCtx.websiteUrl,
        calendarLink: userCtx.calendarLink,
        leadMagnetUrl: userCtx.leadMagnetUrl,

        // Interaction context
        firstName: interactionCtx.senderFirstName || "there",
        lastName: interactionCtx.senderLastName || "",
        senderHeadline: interactionCtx.senderHeadline || "",
        senderCompany: interactionCtx.senderCompany || "",
        messagePreview: interactionCtx.messageContent.slice(0, 100),
    };
}

/**
 * Replace template variables in a string
 * Supports {{variableName}} syntax
 */
export function replaceTemplateVariables(
    template: string,
    variables: TemplateVariables
): string {
    let result = template;

    // Replace each variable
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        result = result.replace(regex, value || "");
    }

    // Clean up any remaining variables
    result = result.replace(/\{\{[a-zA-Z]+\}\}/g, "");

    return result.trim();
}

// ============================================
// OPENROUTER AI HELPER
// ============================================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

async function callOpenRouter(
    messages: OpenRouterMessage[],
    options: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
    } = {}
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not configured");
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "LinkedIn Scheduler",
        },
        body: JSON.stringify({
            model: options.model || "meta-llama/llama-3.1-8b-instruct:free",
            messages,
            max_tokens: options.maxTokens || 300,
            temperature: options.temperature || 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[OpenRouter] Error:", response.status, errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// AI RESPONSE ENHANCER
// ============================================

/**
 * Detect the intent of an incoming message
 */
export async function detectIntent(
    messageContent: string,
    keywords: string[]
): Promise<string> {
    try {
        const result = await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are an intent classifier. Classify the user message into one of these categories:
- "asking_for_resource" - wants PDF, guide, link, etc.
- "interested_in_service" - interested in a product/service
- "scheduling_call" - wants to schedule a call/meeting
- "general_question" - asking a general question
- "gratitude" - saying thank thank you
- "introduction" - introducing themselves
- "other" - doesn't fit other categories

Respond with ONLY the category name, nothing else.`,
                },
                {
                    role: "user",
                    content: `Message: "${messageContent}"\nTrigger keywords matched: ${keywords.join(", ")}`,
                },
            ],
            { maxTokens: 20, temperature: 0.1 }
        );

        return result || "other";
    } catch (error) {
        console.error("[AI Enhancer] Intent detection error:", error);
        return "other";
    }
}

/**
 * Enhance a response with AI personalization
 */
export async function enhanceResponse(
    baseResponse: string,
    userContext: UserContext,
    interactionContext: InteractionContext
): Promise<string> {
    try {
        const result = await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a LinkedIn messaging assistant. Your job is to slightly personalize a template response to make it feel more human and relevant to the recipient.

Rules:
1. Keep the core message intact
2. Make it feel personal, not templated
3. Keep it concise (under 200 words)
4. Match the tone: ${userContext.contentTone}
5. Don't add fake information
6. Use the sender's first name naturally

Business context:
- Business: ${userContext.businessName}
- Industry: ${userContext.industry}
- Value prop: ${userContext.valueProposition}

Recipient context:
- Name: ${interactionContext.senderFirstName}
- Headline: ${interactionContext.senderHeadline || "Unknown"}
- Their message: "${interactionContext.messageContent.slice(0, 100)}"`,
                },
                {
                    role: "user",
                    content: `Personalize this response:\n\n"${baseResponse}"`,
                },
            ],
            { maxTokens: 300, temperature: 0.7 }
        );

        return result || baseResponse;
    } catch (error) {
        console.error("[AI Enhancer] Response enhancement error:", error);
        return baseResponse;
    }
}

/**
 * Generate a fully personalized response from scratch
 */
export async function generatePersonalizedResponse(
    intent: string,
    userContext: UserContext,
    interactionContext: InteractionContext
): Promise<string> {
    try {
        let promptGuidance = "";

        switch (intent) {
            case "asking_for_resource":
                promptGuidance = `They're asking for a resource. Mention your lead magnet: ${userContext.leadMagnetUrl || "your resource"}`;
                break;
            case "interested_in_service":
                promptGuidance = `They're interested in your services. Highlight your value: ${userContext.valueProposition}`;
                break;
            case "scheduling_call":
                promptGuidance = `They want to schedule a call. Share your calendar: ${userContext.calendarLink || "let them know you'd be happy to chat"}`;
                break;
            case "gratitude":
                promptGuidance = "They're saying thank you. Respond warmly and briefly.";
                break;
            default:
                promptGuidance = "Respond helpfully and professionally.";
        }

        const result = await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a LinkedIn messaging assistant for ${userContext.businessName} (${userContext.industry}).

Tone: ${userContext.contentTone}
Services: ${userContext.services.join(", ")}
Target audience: ${userContext.targetAudience}

Write a short, friendly LinkedIn message response. Keep it under 100 words.

${promptGuidance}`,
                },
                {
                    role: "user",
                    content: `${interactionContext.senderFirstName} (${interactionContext.senderHeadline || "LinkedIn user"}) said: "${interactionContext.messageContent}"

Write a personalized response.`,
                },
            ],
            { maxTokens: 200, temperature: 0.8 }
        );

        return result || "";
    } catch (error) {
        console.error("[AI Enhancer] Generation error:", error);
        return "";
    }
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

export async function processAutomationResponse(
    template: string,
    profile: CompanyProfile,
    senderInfo: {
        firstName: string;
        lastName?: string;
        headline?: string;
        company?: string;
    },
    messageContent: string,
    options: {
        enableAI?: boolean;
        keywords?: string[];
    } = {}
): Promise<string> {
    // Aggregate context
    const userCtx = aggregateUserContext(profile);
    const interactionCtx: InteractionContext = {
        senderFirstName: senderInfo.firstName,
        senderLastName: senderInfo.lastName,
        senderHeadline: senderInfo.headline,
        senderCompany: senderInfo.company,
        messageContent,
        mentionedKeywords: options.keywords || [],
    };

    // Build variables and replace in template
    const variables = buildTemplateVariables(userCtx, interactionCtx);
    let response = replaceTemplateVariables(template, variables);

    // Optionally enhance with AI
    if (options.enableAI && process.env.OPENROUTER_API_KEY) {
        response = await enhanceResponse(response, userCtx, interactionCtx);
    }

    return response;
}
