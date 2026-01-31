import Groq from "groq-sdk";

/**
 * Groq API Client
 * Handles all LLM interactions using Groq's fast inference API
 */

// Initialize Groq client with API key from environment
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Available Groq models
 * Using LLaMA 3 for best performance on free tier
 */
export const GROQ_MODELS = {
    LLAMA_70B: "llama-3.3-70b-versatile",
    LLAMA_8B: "llama-3.1-8b-instant",
    MIXTRAL: "mixtral-8x7b-32768",
} as const;

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatCompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

/**
 * Generate a chat completion using Groq
 */
export async function generateChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
): Promise<any> {
    const {
        model = GROQ_MODELS.LLAMA_8B,
        temperature = 0.7,
        maxTokens = 1024,
        stream = false,
    } = options;

    try {
        const completion = await groq.chat.completions.create({
            messages,
            model,
            temperature,
            max_tokens: maxTokens,
            stream,
        });

        return completion as any;
    } catch (error) {
        console.error("Groq API Error:", error);
        throw new Error("Failed to generate completion");
    }
}

/**
 * Translate text to target language
 */
export async function translateText(
    text: string,
    targetLanguage: string = "English"
): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${targetLanguage}. Only return the translated text, nothing else.`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.3,
        maxTokens: 2048,
    });

    return completion.choices[0]?.message?.content || "";
}

/**
 * Summarize text
 */
export async function summarizeText(text: string): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content:
                "You are a professional summarizer. Create a concise, clear summary of the given text. Keep it brief but informative.",
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 512,
    });

    return completion.choices[0]?.message?.content || "";
}

/**
 * Explain text in simple terms
 */
export async function explainText(text: string): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content:
                "You are a helpful teacher. Explain the given text in simple, easy-to-understand terms. Break down complex concepts.",
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
}

/**
 * Rewrite text with specified tone/style
 */
export async function rewriteText(
    text: string,
    style: string = "professional"
): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `You are a professional writer. Rewrite the given text in a ${style} tone. Maintain the core message but improve clarity and style.`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.8,
        maxTokens: 2048,
    });

    return completion.choices[0]?.message?.content || "";
}

/**
 * Generate a task from text
 */
export async function generateTask(text: string): Promise<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
}> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `You are a task management assistant. Convert the given text into a structured task with title, description, and priority (low/medium/high). 
      Return ONLY a JSON object with these fields: {"title": "...", "description": "...", "priority": "..."}`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 512,
    });

    const content = completion.choices[0]?.message?.content || "{}";

    try {
        return JSON.parse(content);
    } catch {
        return {
            title: "New Task",
            description: text,
            priority: "medium",
        };
    }
}

/**
 * Generate an email draft from text
 */
export async function generateEmail(
    text: string,
    tone: string = "professional"
): Promise<{
    subject: string;
    body: string;
}> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `You are an email writing assistant. Convert the given text into a well-formatted email with subject and body in a ${tone} tone.
      Return ONLY a JSON object: {"subject": "...", "body": "..."}`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 1024,
    });

    const content = completion.choices[0]?.message?.content || "{}";

    try {
        return JSON.parse(content);
    } catch {
        return {
            subject: "New Email",
            body: text,
        };
    }
}

export async function enrichData(text: string): Promise<{
    name: string;
    role: string;
    company: string;
    keyPoints: string[];
    email?: string;
    linkedin?: string;
}> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `You are a data enrichment specialist. Analyze the given text (which may be unstructured bio/profile data) and extract structured information.
      Return ONLY a JSON object with these fields: {"name": "...", "role": "...", "company": "...", "keyPoints": ["..."], "email": "...", "linkedin": "..."}
      If a field is missing, use empty string/array.`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.3,
        maxTokens: 1024,
    });

    const content = completion.choices[0]?.message?.content || "{}";

    try {
        return JSON.parse(content);
    } catch {
        return {
            name: "Unknown",
            role: "Unknown",
            company: "Unknown",
            keyPoints: ["Failed to parse data"],
        };
    }
}

export async function chatWithAi(text: string): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: "You are Spinabot, a helpful AI assistant. Answer the user's questions concisely and helpfully.",
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 1024,
    });

    return completion.choices[0]?.message?.content || "I couldn't generate a response.";
}

export default groq;
