import { logger } from "@/features/standalone-agents/agents/linkedin-scheduler/lib/logger";
/**
 * LinkedIn Scheduler - Content Generation API Route
 * Uses Groq API to generate post suggestions based on analysis and preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ContentSuggestion {
    id: string;
    postType: string;
    category: string;
    content: string;
    hashtags: string[];
    matchScore: number;
    status: "suggested" | "scheduled" | "dismissed";
    hook?: string;
    angle?: string;
}

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
        const { companyProfile, selectedPostTypes, analysisResult, agentId, count = 5 } = body;

        if (!companyProfile || !agentId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify agent ownership
        const agent = await prisma.standaloneAgent.findFirst({
            where: { id: agentId, userId: user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        logger.info(`[LinkedIn Generate] Creating ${count} posts for: ${companyProfile.businessName}`);

        // Call Groq API for content generation
        const suggestions = await generateContent(
            companyProfile,
            selectedPostTypes || ["educational", "thought-leadership", "engagement"],
            analysisResult,
            count
        );

        // Save suggestions to agent data
        const agentData = (agent.data as object) || {};
        const updatedData = {
            ...agentData,
            suggestions,
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: {
                data: JSON.parse(JSON.stringify(updatedData)),
            },
        });

        logger.info(`[LinkedIn Generate] Created ${suggestions.length} suggestions`);

        return NextResponse.json({ success: true, suggestions });
    } catch (error) {
        console.error("[LinkedIn Generate] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Generation failed" },
            { status: 500 }
        );
    }
}

async function generateContent(
    profile: any,
    postTypes: string[],
    analysis: any,
    count: number
): Promise<ContentSuggestion[]> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.warn("[LinkedIn Generate] No GROQ_API_KEY, using fallback");
        return generateFallbackContent(profile, postTypes, count);
    }

    const systemPrompt = `You are an expert LinkedIn content creator. Generate ${count} engaging LinkedIn post suggestions.

IMPORTANT: Return ONLY valid JSON array. No markdown, no explanation, just the JSON.

Each post must be an object with this structure:
{
  "postType": "one of: educational, promotional, thought-leadership, case-study, behind-the-scenes, engagement, news-commentary",
  "category": "product | industry | engagement | thought-leadership",
  "content": "The full LinkedIn post text (200-500 characters). Include emojis, line breaks, and a call-to-action.",
  "hashtags": ["3-5 relevant hashtags without #"],
  "matchScore": number 80-99 (how well it fits the company),
  "hook": "Brief description of why this post will work",
  "angle": "The unique perspective or approach"
}

Guidelines for great LinkedIn posts:
1. Start with a strong hook (first line is crucial)
2. Use line breaks for readability
3. Include emojis strategically (not too many)
4. End with a question or CTA to drive engagement
5. Keep it authentic and valuable
6. Make it specific to the company/industry
7. Vary the formats: lists, stories, questions, insights

Return a JSON array of ${count} posts.`;

    const userPrompt = `Create ${count} LinkedIn post suggestions for:

Company: ${profile.businessName}
Industry: ${profile.industry}
Target Audience: ${profile.targetAudience || "Business professionals"}
Content Tone: ${profile.contentTone || "professional"}
Products/Services: ${profile.productsServices?.join(", ") || "Various services"}

Selected Post Types: ${postTypes.join(", ")}

${analysis?.contentThemes ? `Content Themes to Cover: ${analysis.contentThemes.join(", ")}` : ""}
${analysis?.trends ? `Current Trends: ${analysis.trends.map((t: any) => t.topic).join(", ")}` : ""}

Generate diverse, engaging posts that will resonate with the target audience.`;

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
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 3000,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[LinkedIn Generate] Groq API error (${response.status}):`, errorText);
            return generateFallbackContent(profile, postTypes, count);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            console.error("[LinkedIn Generate] Empty response from Groq");
            return generateFallbackContent(profile, postTypes, count);
        }

        // Parse the JSON response
        let parsed = JSON.parse(content);

        // Handle both array and object with posts array
        const posts = Array.isArray(parsed) ? parsed : (parsed.posts || parsed.suggestions || []);

        // Add IDs and status to each suggestion
        const suggestions: ContentSuggestion[] = posts.map((post: any, index: number) => ({
            id: `suggestion-${Date.now()}-${index}`,
            postType: post.postType || postTypes[index % postTypes.length],
            category: post.category || "industry",
            content: post.content,
            hashtags: post.hashtags || [],
            matchScore: post.matchScore || 85 + Math.floor(Math.random() * 10),
            status: "suggested" as const,
            hook: post.hook,
            angle: post.angle,
        }));

        return suggestions;
    } catch (error) {
        console.error("[LinkedIn Generate] Error calling Groq:", error);
        return generateFallbackContent(profile, postTypes, count);
    }
}

function generateFallbackContent(
    profile: any,
    postTypes: string[],
    count: number
): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    const templates = [
        {
            postType: "educational",
            category: "industry",
            template: `📚 ${count > 3 ? "5" : "3"} Key Insights About ${profile.industry}\n\nAfter years in the industry, here's what I've learned:\n\n1️⃣ [Insight one]\n2️⃣ [Insight two]\n3️⃣ [Insight three]\n\nWhat would you add to this list?\n\n👇 Drop your thoughts below`,
            hashtags: [profile.industry.replace(/\s/g, ""), "Insights", "Business"],
            hook: "Educational list post that invites engagement",
            angle: "Industry expertise sharing",
        },
        {
            postType: "thought-leadership",
            category: "thought-leadership",
            template: `💡 Unpopular opinion about ${profile.industry}:\n\nMost companies focus on [common approach].\n\nBut the real winners?\n\nThey do [different approach] instead.\n\nHere's why this matters for ${profile.targetAudience || "professionals"}...`,
            hashtags: ["Leadership", "Strategy", profile.industry.replace(/\s/g, "")],
            hook: "Contrarian take that sparks discussion",
            angle: "Challenging conventional wisdom",
        },
        {
            postType: "engagement",
            category: "engagement",
            template: `Quick question for my ${profile.industry} network:\n\nWhat's the ONE thing you wish you knew when starting out?\n\nI'll go first 👇\n\n"[Your insight here]"\n\nYour turn!`,
            hashtags: ["Community", "Learning", "Career"],
            hook: "Simple question that drives comments",
            angle: "Community building through shared experience",
        },
        {
            postType: "case-study",
            category: "product",
            template: `🏆 Client Win\n\nChallenge: [Client problem]\nSolution: Our approach at ${profile.businessName}\nResult: [Specific outcome]\n\nThe key learning?\n\n[Key takeaway]\n\nWant to know more? Link in comments 👇`,
            hashtags: ["CaseStudy", "Success", "Results"],
            hook: "Social proof with tangible results",
            angle: "Client success story",
        },
        {
            postType: "behind-the-scenes",
            category: "engagement",
            template: `Behind the scenes at ${profile.businessName} 👀\n\n[Describe what you're working on]\n\nWhy we care about this:\n\n✅ [Reason 1]\n✅ [Reason 2]\n✅ [Reason 3]\n\nMore updates coming soon! 🚀`,
            hashtags: ["BehindTheScenes", "TeamWork", "Building"],
            hook: "Authentic peek into company culture",
            angle: "Transparency and authenticity",
        },
    ];

    for (let i = 0; i < Math.min(count, templates.length); i++) {
        const template = templates[i];
        suggestions.push({
            id: `suggestion-${Date.now()}-${i}`,
            postType: template.postType,
            category: template.category,
            content: template.template,
            hashtags: template.hashtags,
            matchScore: 85 + Math.floor(Math.random() * 10),
            status: "suggested",
            hook: template.hook,
            angle: template.angle,
        });
    }

    return suggestions;
}
