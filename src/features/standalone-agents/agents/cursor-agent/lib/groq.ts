import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

/**
 * Chat with AI using page context
 */
export async function chatWithAi(text: string, context?: string): Promise<string> {
  try {
    const messages: any[] = [
      {
        role: "system",
        content: "You are Spinabot, a helpful AI assistant. Provide clear, concise, and accurate responses.",
      },
    ];

    if (context) {
      messages.push({
        role: "system",
        content: `Page context: ${context.slice(0, 12000)}`,
      });
    }

    messages.push({
      role: "user",
      content: text,
    });

    const completion = await groq.chat.completions.create({
      messages,
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("Error in chatWithAi:", error);
    throw new Error("Failed to generate chat response");
  }
}

/**
 * Summarize text content
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a summarization expert. Create concise, informative summaries that capture key points.",
        },
        {
          role: "user",
          content: `Summarize the following text:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 512,
    });

    return completion.choices[0]?.message?.content || "No summary generated.";
  } catch (error) {
    console.error("Error in summarizeText:", error);
    throw new Error("Failed to summarize text");
  }
}

/**
 * Translate text to target language
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate text accurately to ${targetLanguage}.`,
        },
        {
          role: "user",
          content: `Translate to ${targetLanguage}:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "No translation generated.";
  } catch (error) {
    console.error("Error in translateText:", error);
    throw new Error("Failed to translate text");
  }
}

/**
 * Explain text in simple terms
 */
export async function explainText(text: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educator. Explain complex concepts in simple, easy-to-understand terms.",
        },
        {
          role: "user",
          content: `Explain this in simple terms:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.6,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "No explanation generated.";
  } catch (error) {
    console.error("Error in explainText:", error);
    throw new Error("Failed to explain text");
  }
}

/**
 * Rewrite text in specified style
 */
export async function rewriteText(text: string, style: string): Promise<string> {
  try {
    const stylePrompts: Record<string, string> = {
      professional: "Rewrite in a professional, business-appropriate tone",
      casual: "Rewrite in a casual, friendly tone",
      formal: "Rewrite in a formal, academic tone",
      friendly: "Rewrite in a warm, friendly tone",
      concise: "Rewrite to be more concise and to-the-point",
    };

    const prompt = stylePrompts[style.toLowerCase()] || stylePrompts.professional;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional writer skilled in adapting tone and style.",
        },
        {
          role: "user",
          content: `${prompt}:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "No rewrite generated.";
  } catch (error) {
    console.error("Error in rewriteText:", error);
    throw new Error("Failed to rewrite text");
  }
}

/**
 * Generate task from text
 */
export async function generateTask(text: string): Promise<{
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a task management expert. Convert text into structured tasks with title, description, and priority.
Return ONLY valid JSON in this exact format:
{
  "title": "Task title",
  "description": "Detailed description",
  "priority": "low" | "medium" | "high"
}`,
        },
        {
          role: "user",
          content: `Create a task from this:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      title: parsed.title || "Untitled Task",
      description: parsed.description || text,
      priority: parsed.priority || "medium",
    };
  } catch (error) {
    console.error("Error in generateTask:", error);
    // Fallback task
    return {
      title: text.slice(0, 50),
      description: text,
      priority: "medium",
    };
  }
}

/**
 * Generate email from text
 */
export async function generateEmail(text: string, tone: string): Promise<{
  subject: string;
  body: string;
}> {
  try {
    const tonePrompts: Record<string, string> = {
      professional: "professional, clear, and business-appropriate",
      casual: "casual, relaxed, and conversational",
      critical: "critical, direct, and constructive",
      urgent: "direct, concise, and time-sensitive",
      friendly: "warm, inviting, and friendly",
      apologetic: "sincere, apologetic, and understanding",
      formal: "strictly formal, respectful, and structured",
    };

    const toneDesc = tonePrompts[tone.toLowerCase()] || tone;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Spinabot, an expert AI communication assistant. 
Your goal is to write a perfect, human-like email draft based on the user's context.

Tone: ${toneDesc}

Instructions:
1. Analyze the user's input to understand the core message, recipient, and goal.
2. Write a complete email draft including a suitable subject line.
3. The email should sound natural and appropriate for the requested tone.
4. Do NOT use placeholders like [Name] unless absolutely necessary.
5. Return ONLY distinct, valid JSON.

JSON Format:
{
  "subject": "The email subject line",
  "body": "The email body content"
}`,
        },
        {
          role: "user",
          content: `Draft an email based on these points:\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.6,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      // Simple fallback parsing if JSON fails but looks close
      if (cleanContent.includes("subject") && cleanContent.includes("body")) {
        // very basic extraction attempt or just failover
        throw e;
      }
      throw e;
    }

    return {
      subject: parsed.subject || "No Subject",
      body: parsed.body || text,
    };
  } catch (error) {
    console.error("Error in generateEmail:", error);
    // Fallback email
    return {
      subject: "Email Draft",
      body: text,
    };
  }
}

/**
 * Enrich profile data
 */
export async function enrichData(text: string): Promise<{
  name: string;
  role: string;
  company: string;
  keyPoints: string[];
  email?: string;
  linkedin?: string;
}> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a data enrichment expert. Extract structured information from text.
Return ONLY valid JSON in this exact format:
{
  "name": "Person's name",
  "role": "Job title/role",
  "company": "Company name",
  "keyPoints": ["point1", "point2", "point3"],
  "email": "email@example.com or null",
  "linkedin": "LinkedIn URL or null"
}`,
        },
        {
          role: "user",
          content: `Extract profile information from:\n\n${text}`,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      name: parsed.name || "Unknown",
      role: parsed.role || "Unknown",
      company: parsed.company || "Unknown",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      email: parsed.email || undefined,
      linkedin: parsed.linkedin || undefined,
    };
  } catch (error) {
    console.error("Error in enrichData:", error);
    // Fallback data
    return {
      name: "Unknown",
      role: "Unknown",
      company: "Unknown",
      keyPoints: [text.slice(0, 100)],
    };
  }
}
