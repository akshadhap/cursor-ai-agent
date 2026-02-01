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
      Return ONLY a JSON object with these fields: {"title": "...", "description": "...", "priority": "..."}.
      Do NOT include markdown formatting or code blocks.`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.3, // Lower temperature for more deterministic output
        maxTokens: 512,
    });

    let content = completion.choices[0]?.message?.content || "{}";

    // Sanitize JSON
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(content);
    } catch (e) {
        console.warn("Failed to parse task JSON:", content);
        // Fallback: simple text extraction
        return {
            title: text.substring(0, 50).split('\n')[0] || "New Task",
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
      Return ONLY a JSON object: {"subject": "...", "body": "..."}.
      Do NOT include markdown formatting or code blocks.`,
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

    let content = completion.choices[0]?.message?.content || "{}";

    // Sanitize JSON
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(content);
    } catch (e) {
        console.warn("Failed to parse email JSON:", content);
        return {
            subject: "Generated Email",
            body: text, // Fallback to original text or partial content
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
            content: `You are a data enrichment specialist. Analyze the given text (which may be unstructured bio/profile data from search results) and extract structured information.
      Return ONLY a valid JSON object with these fields: {"name": "...", "role": "...", "company": "...", "keyPoints": ["..."], "email": "...", "linkedin": "..."}
      If a field is missing, use "Unknown" or empty array.
      Do NOT include markdown block markers (like \`\`\`json). Return raw JSON only.`,
        },
        {
            role: "user",
            content: text,
        },
    ];

    const completion = await generateChatCompletion(messages, {
        temperature: 0.2, // Low temperature for consistent JSON
        maxTokens: 1024,
        model: GROQ_MODELS.LLAMA_70B, // Use 70B model for better reasoning on data extraction
    });

    let content = completion.choices[0]?.message?.content || "{}";

    // Robust JSON sanitization
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    // Remove any text before the first '{' and after the last '}'
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        content = content.substring(jsonStart, jsonEnd + 1);
    }

    try {
        const data = JSON.parse(content);
        return {
            name: data.name || "Unknown",
            role: data.role || "Unknown",
            company: data.company || "Unknown",
            keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
            email: data.email,
            linkedin: data.linkedin
        };
    } catch (e) {
        console.warn("Failed to parse enrichment JSON:", content);

        // Final fallback: Regex extraction
        return {
            name: content.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || "Unknown",
            role: content.match(/"role"\s*:\s*"([^"]+)"/)?.[1] || "Unknown",
            company: content.match(/"company"\s*:\s*"([^"]+)"/)?.[1] || "Unknown",
            keyPoints: ["Data parsing partially failed, but search succeeded."],
        };
    }
}

export async function chatWithAi(text: string, context?: string): Promise<string> {
    const systemPrompt = `You are Spinabot, a helpful, witty, and friendly AI assistant. 
    ${context ? `\nHere is the content of the webpage the user is currently viewing:\n---\n${context.substring(0, 15000)}\n---\nUse this context to answer questions about the page. If asked to summarize, summarize this content.` : ''}
    
    Guidelines:
    - Chat naturally and conversationally.
    - Be concise but helpful.
    - Do NOT start responses with "As an AI" or "I am a large language model".
    - If the user asks about the page, use the provided context.
    - Use markdown for formatting (bold, lists) if helpful.`;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: systemPrompt,
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
