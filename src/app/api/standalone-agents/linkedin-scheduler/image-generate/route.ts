import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - AI Image Generation API
 * Generates LinkedIn-relevant images from post content
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// OpenRouter for image generation (supports DALL-E, Flux, etc.)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/images/generations";

// POST - Generate image prompt or image
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { agentId, postContent, action, customPrompt } = body;

        if (!agentId || !postContent) {
            return NextResponse.json({ error: "Missing agentId or postContent" }, { status: 400 });
        }

        // Verify agent ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        if (action === "generate_prompt") {
            // Generate an image prompt from post content
            const prompt = await generateImagePrompt(postContent);
            return NextResponse.json({ success: true, prompt });
        }

        if (action === "generate_image") {
            // Generate actual image using provided or generated prompt
            const imagePrompt = customPrompt || await generateImagePrompt(postContent);
            const imageUrl = await generateImage(imagePrompt);

            if (!imageUrl) {
                return NextResponse.json({
                    error: "Image generation not configured. Please add OPENROUTER_API_KEY to environment."
                }, { status: 503 });
            }

            return NextResponse.json({ success: true, imageUrl, prompt: imagePrompt });
        }

        return NextResponse.json({ error: "Invalid action. Use 'generate_prompt' or 'generate_image'" }, { status: 400 });
    } catch (error) {
        console.error("[Image Gen] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Image generation failed" },
            { status: 500 }
        );
    }
}

/**
 * Generate a LinkedIn-optimized image prompt from post content
 */
async function generateImagePrompt(postContent: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        // Return a basic prompt if no API key
        return generateFallbackPrompt(postContent);
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You are an expert at creating DETAILED image prompts for AI image generators like Midjourney, DALL-E, and Leonardo AI. Your prompts should generate professional, business-appropriate visuals that enhance LinkedIn posts.

CREATE A COMPREHENSIVE PROMPT INCLUDING:

1. **Subject/Main Element** - What is the central visual element? Be very specific.
   - If about leadership: "A confident professional standing at a modern glass podium"
   - If about growth: "Abstract rising graph with glowing nodes and connections"
   - If about teamwork: "Diverse group of professionals collaborating around a holographic display"

2. **Style & Medium** - Specify the artistic style:
   - "3D render, isometric view, clean minimal design"
   - "Photorealistic, cinematic lighting, shallow depth of field"
   - "Flat vector illustration, geometric shapes, modern corporate design"
   - "Digital art, sci-fi aesthetic, holographic elements"

3. **Color Palette** - Be specific about colors:
   - "Deep navy blue (#1a365d) gradient to teal (#38b2ac), white accents"
   - "Purple and gold color scheme with subtle gradients"
   - "Monochromatic blue with glowing cyan highlights"

4. **Composition & Layout**:
   - "Centered composition with radial symmetry"
   - "Rule of thirds, main subject on left, negative space for text on right"
   - "Bird's eye view, isometric angle, clean white background"

5. **Lighting & Mood**:
   - "Soft ambient lighting, warm corporate atmosphere"
   - "Dramatic rim lighting, futuristic tech feel"
   - "Natural daylight, optimistic and energetic mood"

6. **Additional Details**:
   - "8K resolution, highly detailed, sharp focus"
   - "LinkedIn professional context, business-appropriate"
   - "No text, clean edges, suitable for social media"

IMPORTANT RULES:
- NO text or words in the image (AI struggles with text)
- Must be professional and business-appropriate
- Focus on visual metaphors that represent the post's core message
- Include aspect ratio: "--ar 1:1" for square, "--ar 4:5" for portrait
- Make the prompt 150-300 words for best results

OUTPUT: Return ONLY the detailed prompt, nothing else. No explanations or commentary.`
                    },
                    {
                        role: "user",
                        content: `Create a detailed Midjourney/DALL-E image prompt for this LinkedIn post:\n\n"""${postContent.slice(0, 1500)}"""\n\nGenerate a comprehensive, detailed image prompt.`
                    }
                ],
                temperature: 0.8,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            console.error("[Image Gen] Groq error:", response.status);
            return generateFallbackPrompt(postContent);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || generateFallbackPrompt(postContent);
    } catch (error) {
        console.error("[Image Gen] Prompt generation error:", error);
        return generateFallbackPrompt(postContent);
    }
}

/**
 * Generate a fallback prompt from post content keywords
 */
function generateFallbackPrompt(postContent: string): string {
    // Extract key themes from content
    const contentLower = postContent.toLowerCase();

    const themes = [];
    if (contentLower.includes("ai") || contentLower.includes("artificial intelligence")) {
        themes.push("AI neural network");
    }
    if (contentLower.includes("team") || contentLower.includes("collaboration")) {
        themes.push("team collaboration");
    }
    if (contentLower.includes("growth") || contentLower.includes("success")) {
        themes.push("upward growth arrows");
    }
    if (contentLower.includes("data") || contentLower.includes("analytics")) {
        themes.push("data visualization");
    }
    if (contentLower.includes("startup") || contentLower.includes("entrepreneur")) {
        themes.push("startup rocket");
    }
    if (contentLower.includes("leadership") || contentLower.includes("leader")) {
        themes.push("leadership summit");
    }

    const theme = themes.length > 0 ? themes[0] : "professional business concept";

    return `Professional minimalist illustration of ${theme}, modern gradient background in blue and purple tones, clean corporate aesthetic, suitable for LinkedIn`;
}

/**
 * Generate image using TogetherAI or OpenRouter API
 */
async function generateImage(prompt: string): Promise<string | null> {
    // Try TogetherAI first (better image generation support)
    const togetherKey = process.env.TOGETHER_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Method 1: TogetherAI (recommended for image generation)
    if (togetherKey) {
        try {
            logger.info("[Image Gen] Using TogetherAI for image generation");
            const response = await fetch("https://api.together.xyz/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${togetherKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "black-forest-labs/FLUX.1-schnell-Free",
                    prompt: prompt,
                    width: 1024,
                    height: 1024,
                    steps: 4,
                    n: 1,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const imageUrl = data.data?.[0]?.url || data.output?.url;
                if (imageUrl) {
                    logger.info("[Image Gen] TogetherAI success");
                    return imageUrl;
                }
            } else {
                const errorText = await response.text();
                console.error("[Image Gen] TogetherAI error:", response.status, errorText);
            }
        } catch (error) {
            console.error("[Image Gen] TogetherAI error:", error);
        }
    }

    // Method 2: OpenRouter (fallback - may not support all image models)
    if (openrouterKey) {
        try {
            logger.info("[Image Gen] Using OpenRouter for image generation");
            const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openrouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                },
                body: JSON.stringify({
                    model: "black-forest-labs/flux-schnell",
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024",
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const imageUrl = data.data?.[0]?.url;
                if (imageUrl) {
                    logger.info("[Image Gen] OpenRouter success");
                    return imageUrl;
                }
            } else {
                const errorText = await response.text();
                console.error("[Image Gen] OpenRouter error:", response.status, errorText);
            }
        } catch (error) {
            console.error("[Image Gen] OpenRouter error:", error);
        }
    }

    logger.info("[Image Gen] No API key configured or all methods failed");
    return null;
}
