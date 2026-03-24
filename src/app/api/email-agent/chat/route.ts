import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Action types the chat bot can perform
type ActionType = 'CREATE_RULE' | 'CREATE_JIRA_TASK' | 'ADD_KNOWLEDGE' | 'SEARCH_KNOWLEDGE' | 'DELETE_KNOWLEDGE' | 'NONE';

interface ActionRequest {
    action: ActionType;
    params: any;
    confirmationMessage: string;
}

interface ChatResponse {
    reply: string;
    emails?: any[];
    suggestions?: string[];
    actionExecuted?: { type: string; success: boolean; details?: any };
}

/**
 * Chat API - Fully LLM-powered email assistant
 * POST /api/email-agent/chat
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get actual user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { message, conversationHistory = [], context } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        console.log(`[Chat] User: ${user.email}, Message: "${message}"`);

        // Fetch user's email data and knowledge base from agent config
        const agent = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
            select: { data: true, config: true },
        });

        console.log(`[Chat] Agent found: ${!!agent}`);

        const agentData = agent?.data as any;
        const agentConfig = agent?.config as any;
        const emails = agentData?.emails || [];
        const stats = agentData?.stats || {};

        // Get knowledge base from agent config (The Brain) - with defensive array check
        const rawKB = agentConfig?.knowledgeBase;
        const knowledgeBase = Array.isArray(rawKB) ? rawKB.slice(0, 20) : [];

        // Debug: Count emails with attachments
        const emailsWithAttachments = emails.filter((e: any) => e.attachments && e.attachments.length > 0).length;
        const totalAttachments = emails.reduce((acc: number, e: any) => acc + (e.attachments?.length || 0), 0);
        console.log(`[Chat] Agent Data - Emails: ${emails.length}, With attachments: ${emailsWithAttachments}, Total attachments: ${totalAttachments}`);

        // Prepare email context for LLM
        let emailContext = "";
        try {
            emailContext = prepareEmailContext(emails, stats);
            console.log(`[Chat] Context prepared. Length: ${emailContext.length}`);
        } catch (e) {
            console.error("[Chat] Failed to prepare context:", e);
            emailContext = "Context generation failed.";
        }

        // Detect if user wants to perform an action
        const actionIntent = detectActionIntent(message);
        console.log(`[Chat] Action intent: ${actionIntent}`);

        // Check for predefined responses (Greetings, simple queries) - Bypass LLM
        if (actionIntent === 'NONE') {
            const predefined = getPredefinedResponse(message, user.name || "there");
            if (predefined) {
                console.log(`[Chat] Using predefined response for: "${message}"`);
                return NextResponse.json({
                    reply: predefined.reply,
                    emails: [],
                    suggestions: predefined.suggestions,
                });
            }

            // Check for email-based queries - NO LLM NEEDED
            const emailBased = getEmailBasedResponse(message, emails);
            if (emailBased) {
                console.log(`[Chat] Using rule-based response for: "${message}" (no LLM)`);
                return NextResponse.json({
                    reply: emailBased.reply,
                    emails: emailBased.emails || [],
                    suggestions: emailBased.suggestions,
                });
            }
        }

        // Get agent for action execution
        const agentForAction = await prisma.standaloneAgent.findFirst({
            where: { userId: user.id, type: "GMAIL_CLASSIFIER" },
        });

        // ⚠️ LLM DISABLE FLAG - Set to true to use rule-based system only
        const DISABLE_LLM = false; // Using LLM for now (rule-based system disabled)

        if (DISABLE_LLM) {
            console.log(`[Chat] LLM DISABLED - Action intent: ${actionIntent}, Message: "${message}"`);

            // =====================================================
            // ACTION: CREATE_RULE - Parse and create automation rule
            // =====================================================
            if (actionIntent === 'CREATE_RULE' && agentForAction) {
                const ruleParams = parseRuleFromMessage(message);

                if (!ruleParams) {
                    return NextResponse.json({
                        reply: "🤔 I need more details to create a rule.\n\nTry something like:\n• \"Create a rule to archive emails from amazon\"\n• \"Auto-label emails about invoices as important\"\n• \"Forward emails from boss@company.com to team@company.com\"",
                        emails: [],
                        suggestions: ["Show unread", "Summary", "Show important"]
                    });
                }

                try {
                    // Build rule structure
                    const agentConfig = (agentForAction.config as any) || {};
                    const existingRules = agentConfig?.automationRules || [];

                    const conditions: any[] = [];
                    if (ruleParams.sender) {
                        conditions.push({ type: 'sender', operator: 'contains', value: ruleParams.sender });
                    }
                    if (ruleParams.domain) {
                        conditions.push({ type: 'sender', operator: 'contains', value: ruleParams.domain });
                    }
                    if (ruleParams.keywords && ruleParams.keywords.length > 0) {
                        conditions.push({ type: 'subject', operator: 'contains', value: ruleParams.keywords.join(' ') });
                    }

                    const newRule = {
                        id: `rule_${Date.now()}`,
                        name: `${ruleParams.actionType} emails from ${ruleParams.sender || ruleParams.domain || 'matching keywords'}`,
                        enabled: true,
                        conditions,
                        action: {
                            type: ruleParams.actionType,
                            config: {
                                label: ruleParams.labelName,
                                forwardTo: ruleParams.forwardTo,
                            },
                        },
                        createdAt: new Date().toISOString(),
                        createdBy: 'chat',
                    };

                    await prisma.standaloneAgent.update({
                        where: { id: agentForAction.id },
                        data: {
                            config: {
                                ...agentConfig,
                                automationRules: [...existingRules, newRule],
                            },
                        },
                    });

                    const target = ruleParams.sender || ruleParams.domain || ruleParams.keywords?.join(', ');
                    return NextResponse.json({
                        reply: `✅ Rule created successfully!\n\nI'll now ${ruleParams.actionType} emails from "${target}".\n\nYou can view and manage your rules in the Settings tab.`,
                        emails: [],
                        suggestions: ["Show unread", "Summary", "Create another rule"]
                    });
                } catch (error) {
                    console.error('[Chat] Rule creation error:', error);
                    return NextResponse.json({
                        reply: "❌ Sorry, I couldn't create that rule. Please try again or create it manually in Settings.",
                        emails: [],
                        suggestions: ["Show unread", "Summary"]
                    });
                }
            }

            // =====================================================
            // ACTION: ADD_KNOWLEDGE - Add to knowledge base
            // =====================================================
            if (actionIntent === 'ADD_KNOWLEDGE' && agentForAction) {
                const kbContent = parseKnowledgeFromMessage(message, 'ADD_KNOWLEDGE');

                if (!kbContent.content) {
                    return NextResponse.json({
                        reply: "🤔 I'm not sure what to remember.\n\nTry something like:\n• \"Remember that my manager is John Smith\"\n• \"Note that project deadline is March 15th\"\n• \"Learn that support emails should go to team@company.com\"",
                        emails: [],
                        suggestions: ["Show unread", "What do you know?"]
                    });
                }

                try {
                    const agentConfig = (agentForAction.config as any) || {};
                    const existingKB = Array.isArray(agentConfig?.knowledgeBase) ? agentConfig.knowledgeBase : [];

                    const newEntry = {
                        id: `kb_${Date.now()}`,
                        title: kbContent.title || 'Chat note',
                        content: kbContent.content,
                        type: 'text',
                        tags: ['chat-added'],
                        createdAt: new Date().toISOString(),
                    };

                    await prisma.standaloneAgent.update({
                        where: { id: agentForAction.id },
                        data: {
                            config: {
                                ...agentConfig,
                                knowledgeBase: [...existingKB, newEntry],
                            },
                        },
                    });

                    return NextResponse.json({
                        reply: `🧠 Got it! I've remembered that.\n\n"${kbContent.content.substring(0, 100)}${kbContent.content.length > 100 ? '...' : ''}"`,
                        emails: [],
                        suggestions: ["What do you know?", "Show unread", "Summary"]
                    });
                } catch (error) {
                    console.error('[Chat] Knowledge add error:', error);
                    return NextResponse.json({
                        reply: "❌ Sorry, I couldn't save that. Please try again.",
                        emails: [],
                        suggestions: ["Show unread", "Summary"]
                    });
                }
            }

            // =====================================================
            // ACTION: SEARCH_KNOWLEDGE - Query knowledge base
            // =====================================================
            if (actionIntent === 'SEARCH_KNOWLEDGE') {
                const kbQuery = parseKnowledgeFromMessage(message, 'SEARCH_KNOWLEDGE');

                if (!kbQuery.searchQuery) {
                    // Show all knowledge
                    if (knowledgeBase.length === 0) {
                        return NextResponse.json({
                            reply: "📚 I don't have any notes stored yet.\n\nTeach me something by saying:\n• \"Remember that [info]\"\n• \"Note that [fact]\"",
                            emails: [],
                            suggestions: ["Show unread", "Summary"]
                        });
                    }

                    const kbList = knowledgeBase.slice(0, 5).map((k: any) => `• ${k.title || k.content?.substring(0, 50)}`).join('\n');
                    return NextResponse.json({
                        reply: `📚 Here's what I know (${knowledgeBase.length} entries):\n\n${kbList}`,
                        emails: [],
                        suggestions: ["Show unread", "Summary"]
                    });
                }

                // Search knowledge base
                const query = kbQuery.searchQuery.toLowerCase();
                const matches = knowledgeBase.filter((k: any) =>
                    k.content?.toLowerCase().includes(query) ||
                    k.title?.toLowerCase().includes(query)
                );

                if (matches.length === 0) {
                    return NextResponse.json({
                        reply: `🔍 I don't have any notes about "${kbQuery.searchQuery}".\n\nTeach me by saying: "Remember that [info about ${kbQuery.searchQuery}]"`,
                        emails: [],
                        suggestions: [`Remember that ${kbQuery.searchQuery}...`, "Show unread"]
                    });
                }

                const matchList = matches.slice(0, 3).map((k: any) => `📝 ${k.content}`).join('\n\n');
                return NextResponse.json({
                    reply: `📚 Here's what I know about "${kbQuery.searchQuery}":\n\n${matchList}`,
                    emails: [],
                    suggestions: ["Show unread", "Summary", "Forget about this"]
                });
            }

            // =====================================================
            // ACTION: DELETE_KNOWLEDGE - Remove from knowledge base
            // =====================================================
            if (actionIntent === 'DELETE_KNOWLEDGE' && agentForAction) {
                const kbQuery = parseKnowledgeFromMessage(message, 'DELETE_KNOWLEDGE');

                if (!kbQuery.searchQuery) {
                    return NextResponse.json({
                        reply: "🤔 What should I forget?\n\nTry: \"Forget about [topic]\"",
                        emails: [],
                        suggestions: ["What do you know?", "Show unread"]
                    });
                }

                try {
                    const agentConfig = (agentForAction.config as any) || {};
                    const existingKB = Array.isArray(agentConfig?.knowledgeBase) ? agentConfig.knowledgeBase : [];

                    const query = kbQuery.searchQuery.toLowerCase();
                    const updatedKB = existingKB.filter((k: any) =>
                        !k.content?.toLowerCase().includes(query) &&
                        !k.title?.toLowerCase().includes(query)
                    );

                    const removed = existingKB.length - updatedKB.length;

                    if (removed === 0) {
                        return NextResponse.json({
                            reply: `🤔 I don't have any notes about "${kbQuery.searchQuery}" to forget.`,
                            emails: [],
                            suggestions: ["What do you know?", "Show unread"]
                        });
                    }

                    await prisma.standaloneAgent.update({
                        where: { id: agentForAction.id },
                        data: {
                            config: { ...agentConfig, knowledgeBase: updatedKB },
                        },
                    });

                    return NextResponse.json({
                        reply: `🗑️ Done! I've forgotten ${removed} note${removed !== 1 ? 's' : ''} about "${kbQuery.searchQuery}".`,
                        emails: [],
                        suggestions: ["What do you know?", "Show unread"]
                    });
                } catch (error) {
                    console.error('[Chat] Knowledge delete error:', error);
                    return NextResponse.json({
                        reply: "❌ Sorry, I couldn't delete that. Please try again.",
                        emails: [],
                        suggestions: ["Show unread"]
                    });
                }
            }

            // For unmatched queries, suggest what they can ask
            return NextResponse.json({
                reply: "I can help you with:\n\n📧 Email queries:\n• \"Show unread emails\"\n• \"Summarize my inbox\"\n• \"Emails from [sender]\"\n\n⚙️ Automation:\n• \"Create a rule to archive emails from [sender]\"\n\n🧠 Memory:\n• \"Remember that [info]\"\n• \"What do you know about [topic]?\"\n\nTry one of these!",
                emails: [],
                suggestions: ["Show unread", "Summary", "Create a rule"]
            });
        }

        // Generate response using Groq LLM (with action awareness)
        const response = await generateLLMResponse(
            message,
            emailContext,
            user.name || user.email,
            conversationHistory,
            knowledgeBase,
            context,
            actionIntent
        );

        // Check if LLM response contains an action to execute
        let actionResult: { type: string; success: boolean; details?: any } | undefined;

        if (response.actionRequest && agentForAction) {
            console.log(`[Chat] Executing action: ${response.actionRequest.action}`);
            actionResult = await executeAction(response.actionRequest, agentForAction.id, user.id);
        }

        // Extract relevant emails if mentioned in response
        const relevantEmails = extractRelevantEmails(response.reply, emails, message);

        return NextResponse.json({
            reply: actionResult?.success
                ? response.actionRequest?.confirmationMessage || response.reply
                : response.reply,
            emails: relevantEmails,
            suggestions: response.suggestions,
            actionExecuted: actionResult,
        });

    } catch (error) {
        console.error("Chat error details:", error);
        console.error("Stack:", (error as Error).stack);
        return NextResponse.json(
            {
                reply: "I'm having trouble processing your request. Please try again.",
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

/**
 * Prepare email context summary for LLM
 */
function prepareEmailContext(emails: any[], stats: any): string {
    if (emails.length === 0) {
        return "No emails synced yet.";
    }

    // Category breakdown
    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};
    let unreadCount = 0;

    emails.forEach((email: any) => {
        categories[email.category] = (categories[email.category] || 0) + 1;
        priorities[email.priority] = (priorities[email.priority] || 0) + 1;
        if (!email.isRead) unreadCount++;
    });

    // Recent emails (last 20 for context)
    const recentEmails = emails.slice(0, 20).map((e: any, i: number) => ({
        index: i + 1,
        subject: e.subject?.substring(0, 60),
        from: extractSenderName(e.from),
        category: e.category,
        priority: e.priority,
        isRead: e.isRead,
        date: new Date(e.date).toLocaleDateString(),
        hasAttachments: e.attachments && e.attachments.length > 0,
        attachmentCount: e.attachments?.length || 0,
        attachmentTypes: e.attachments?.map((a: any) => a.filename?.split('.').pop()?.toUpperCase()).filter(Boolean) || [],
    }));

    // Count emails with attachments
    const emailsWithAttachments = emails.filter((e: any) => e.attachments && e.attachments.length > 0).length;
    const totalAttachments = emails.reduce((acc: number, e: any) => acc + (e.attachments?.length || 0), 0);

    // Build context
    let context = `
INBOX SUMMARY:
- Total emails: ${emails.length}
- Unread: ${unreadCount}
- Emails with attachments: ${emailsWithAttachments} (${totalAttachments} total files)
- Categories: ${Object.entries(categories).map(([k, v]) => `${k}(${v})`).join(", ")}
- Priorities: ${Object.entries(priorities).map(([k, v]) => `${k}(${v})`).join(", ")}

RECENT EMAILS (newest first):
${recentEmails.map(e => `${e.index}. [${e.isRead ? 'READ' : 'UNREAD'}] "${e.subject}" from ${e.from} (${e.category}, ${e.priority}) - ${e.date}${e.hasAttachments ? ` [📎 ${e.attachmentCount} file(s): ${e.attachmentTypes.join(', ')}]` : ''}`).join("\n")}
`;

    // Add action items
    const actionItems = emails.filter((e: any) =>
        e.category === "requires_action" || e.priority === "high" || e.priority === "critical"
    ).slice(0, 5);

    if (actionItems.length > 0) {
        context += `\nACTION ITEMS (needs attention):
${actionItems.map((e: any, i: number) => `${i + 1}. "${e.subject?.substring(0, 50)}" from ${extractSenderName(e.from)}`).join("\n")}
`;
    }

    return context;
}

/**
 * Extract sender name from email address
 */
function extractSenderName(from: string): string {
    const match = from?.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, "") : from || "Unknown";
}

/**
 * Generate response using Groq LLM
 */
async function generateLLMResponse(
    userMessage: string,
    emailContext: string,
    userName: string,
    conversationHistory: any[],
    knowledgeBase: any[] = [],
    currentContext?: { subject: string; content: string; from: string } | null,
    actionIntent: ActionType = 'NONE'
): Promise<{ reply: string; suggestions?: string[]; actionRequest?: ActionRequest }> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        // Fallback to simple response if no API key
        return {
            reply: "I can help you with your emails! Try asking about unread messages, important emails, or emails from specific senders.",
            suggestions: ["Show unread emails", "What needs attention?", "Show emails from Google"],
        };
    }

    let systemPrompt = `You are an HONEST email assistant for ${userName}. You help with email queries.

CRITICAL RULES:
1. BE HONEST - If you don't have data or can't find what the user asked for, say so clearly.
2. NEVER HALLUCINATE - Only mention emails/attachments that actually exist in the context I give you.
3. ASK QUESTIONS - If the user's request is unclear, ask a clarifying question instead of guessing.
4. KEEP RESPONSES SHORT - 1-2 sentences max. Be direct and actionable.
5. CHECK ATTACHMENTS - When user asks for PDFs/documents, ONLY count emails that have [📎 ...] in my context.
`;

    // Add Action-Specific Instructions if intent detected
    if (actionIntent === 'CREATE_RULE') {
        systemPrompt += `
ACTION DETECTED: CREATE_RULE
The user wants to create an automation rule.
1. CHECK: Did the user specify WHO the rule is for (sender/subject) AND WHAT action to take?
2. IF DETAILS MISSING: Return a normal text response asking for details (e.g. "Who should this rule apply to?"). DO NOT RETURN JSON.
3. IF DETAILS PRESENT: You can proceed. Return a JSON object with this structure:
\`\`\`json
{
  "action": "CREATE_RULE",
  "params": {
    "ruleName": "Rule Name",
    "conditions": [{"field": "from|subject|category", "operator": "contains|equals", "value": "string"}],
    "actionType": "create_jira_task",
    "actionConfig": {}
  },
  "confirmationMessage": "I've created a rule to..."
}
\`\`\`
Extract the condition (e.g. "from spinabot") and suggest a descriptive name.
`;
    } else if (actionIntent === 'CREATE_JIRA_TASK') {
        systemPrompt += `
ACTION DETECTED: CREATE_JIRA_TASK
The user wants to create a Jira task.
1. CHECK: Do you know WHICH email to create a task for?
2. IF DETAILS MISSING: Ask which email (e.g. "For which email?"). DO NOT RETURN JSON.
3. IF DETAILS PRESENT: Return a JSON object with this structure:
\`\`\`json
{
  "action": "CREATE_JIRA_TASK",
  "params": {
    "emailId": "if_known_otherwise_null",
    "summary": "Task Summary",
    "description": "Task Description"
  },
  "confirmationMessage": "I've created a Jira task..."
}
\`\`\`
`;
    }

    systemPrompt += `
`;

    // Inject Specific Email Context if available
    if (currentContext) {
        systemPrompt += `
CURRENT CONTEXT (User is looking at this email):
Subject: "${currentContext.subject || 'N/A'}"
From: "${currentContext.from || 'N/A'}"
Content Snippet: "${currentContext.content ? currentContext.content.substring(0, 500) : 'N/A'}..."
--------------------------------------------------
`;
    }

    // Inject Knowledge Base (The Brain)
    if (knowledgeBase.length > 0) {
        systemPrompt += `
USER KNOWLEDGE BASE (My Brain / Preferences):
${knowledgeBase.map(k => `- ${k.content}`).join('\n')}
--------------------------------------------------
`;
    }

    systemPrompt += `
GOOD RESPONSES:
- "Found 5 emails needing your attention:" (when emails actually exist)
- "I don't see any emails with image attachments in your synced inbox."
- "Could you clarify what you mean by 'recent emails'? Last 24 hours or this week?"
- "You have 12 unread messages. Here are the top ones:"

BAD RESPONSES (NEVER DO):
- Saying "I found X emails" then showing unrelated ones
- Listing random emails when no match exists
- Making up data that's not in the context
- Showing emails without the attachment type the user asked for

IMPORTANT - ATTACHMENT QUERIES:
- When user asks for "PDFs" or "images", ONLY count emails with [📎 ...] marker
- If context shows NO emails with [📎 ...], say "I don't see any emails with attachments in your current inbox. Try doing a fresh sync."
- If asking for PDFs but I only see Word files, say "I see 2 emails with Word documents, but none with PDFs."

Current inbox (ONLY USE THIS DATA, DO NOT INVENT):
${emailContext}`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
        { role: "user", content: userMessage },
    ];

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 500,
                response_format: (actionIntent !== 'NONE') ? { type: "json_object" } : undefined
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq API error (${response.status}):`, errorText);

            // Handle rate limiting specifically
            if (response.status === 429) {
                return {
                    reply: "⚠️ I'm being rate limited by the AI service. Please wait a few seconds and try again.",
                    suggestions: ["Try again in 10 seconds", "Show unread emails"],
                };
            }

            // Handle auth errors
            if (response.status === 401 || response.status === 403) {
                return {
                    reply: "⚠️ AI service authentication failed. Please contact support.",
                    suggestions: ["Contact support"],
                };
            }

            throw new Error(`LLM API error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0]?.message?.content || "I couldn't understand that. Could you rephrase?";
        let actionRequest: ActionRequest | undefined;

        // Parse JSON response if action was requested
        if (actionIntent !== 'NONE') {
            try {
                // Determine if content is JSON or wrapped in markdown
                if (content.includes('```json')) {
                    content = content.replace(/```json\n?|```/g, '');
                }
                const parsed = JSON.parse(content);
                if (parsed.action && parsed.params) {
                    actionRequest = parsed;
                    content = parsed.confirmationMessage || "Action processed.";
                } else if (parsed.reply) {
                    // Fallback if LLM returns { reply: "..." } structure instead of action
                    content = parsed.reply;
                }
            } catch (e) {
                console.error("Failed to parse JSON response:", e);
                // content remains as is (raw string)
            }
        }

        // Generate contextual suggestions
        const suggestions = generateSuggestions(userMessage);

        return { reply: content, suggestions, actionRequest };

    } catch (error) {
        console.error("LLM error:", error);
        return {
            reply: "I'm having trouble connecting to my brain right now. Let me try a simpler approach - what would you like to know about your emails?",
            suggestions: ["How many unread?", "Show important emails", "What needs attention?"],
        };
    }
}

/**
 * Generate contextual follow-up suggestions
 */
function generateSuggestions(lastMessage: string): string[] {
    const lower = lastMessage.toLowerCase();

    if (lower.includes("unread")) {
        return ["Show more details", "Mark all as read", "Show by category"];
    }
    if (lower.includes("attention") || lower.includes("important")) {
        return ["Show all action items", "Emails from this week", "Archive read emails"];
    }
    if (lower.includes("from")) {
        return ["Show more from this sender", "Similar emails", "Show unread"];
    }
    if (lower.includes("rule") || lower.includes("automation")) {
        return ["List my rules", "Create another rule", "Show automation history"];
    }

    return ["Show unread", "What needs attention?", "Summary"];
}

/**
 * Extract relevant emails based on LLM response and user query
 */
function extractRelevantEmails(reply: string, allEmails: any[], userMessage: string): any[] {
    const queryLower = userMessage.toLowerCase();

    // Strict Display Intent Check
    // only show emails if user explicitly asks to "show", "list", "find", "give", "what are", etc.
    const displayTriggers = ["show", "list", "give", "find", "search", "display", "what are", "which", "see", "view"];
    const hasDisplayIntent = displayTriggers.some(t => queryLower.includes(t));

    // Exception: "unread" often implies "show me unread"
    const isUnreadQuery = queryLower.includes("unread");

    // If no display intent and not an unread query, return nothing (text only response)
    if (!hasDisplayIntent && !isUnreadQuery) {
        return [];
    }

    let matched: any[] = [];

    // Determine what type of emails to show
    if (queryLower.includes("unread")) {
        matched = allEmails.filter((e: any) => !e.isRead);
    } else if (queryLower.includes("action") || queryLower.includes("attention") ||
        queryLower.includes("important") || queryLower.includes("urgent")) {
        matched = allEmails.filter((e: any) =>
            e.category === "requires_action" ||
            e.priority === "high" ||
            e.priority === "critical"
        );
    } else if (queryLower.includes("promo")) {
        matched = allEmails.filter((e: any) => e.category === "promotional");
    } else if (queryLower.includes("newsletter")) {
        matched = allEmails.filter((e: any) => e.category === "newsletters");
    } else if (queryLower.includes("update")) {
        matched = allEmails.filter((e: any) => e.category === "updates");
    } else if (queryLower.includes("pdf") || queryLower.includes("document") || queryLower.includes("attachment") || queryLower.includes("file") || queryLower.includes("image") || queryLower.includes("photo") || queryLower.includes("picture")) {
        // Attachment-based filter
        const isPdfOnly = queryLower.includes("pdf");
        const isDocOnly = queryLower.includes("doc") || queryLower.includes("word");
        const isExcelOnly = queryLower.includes("excel") || queryLower.includes("spreadsheet") || queryLower.includes("xls");
        const isImageOnly = queryLower.includes("image") || queryLower.includes("photo") || queryLower.includes("picture");

        matched = allEmails.filter((e: any) => {
            if (!e.attachments || e.attachments.length === 0) return false;

            // If asking for specific type, filter by that type
            if (isPdfOnly) {
                return e.attachments.some((a: any) =>
                    a.mimeType === 'application/pdf' ||
                    a.filename?.toLowerCase().endsWith('.pdf')
                );
            }
            if (isDocOnly) {
                return e.attachments.some((a: any) =>
                    a.mimeType?.includes('word') ||
                    a.filename?.toLowerCase().endsWith('.doc') ||
                    a.filename?.toLowerCase().endsWith('.docx')
                );
            }
            if (isExcelOnly) {
                return e.attachments.some((a: any) =>
                    a.mimeType?.includes('spreadsheet') ||
                    a.mimeType?.includes('excel') ||
                    a.filename?.toLowerCase().endsWith('.xls') ||
                    a.filename?.toLowerCase().endsWith('.xlsx') ||
                    a.filename?.toLowerCase().endsWith('.csv')
                );
            }
            if (isImageOnly) {
                return e.attachments.some((a: any) =>
                    a.mimeType?.startsWith('image/') ||
                    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a.filename || '')
                );
            }

            // Generic attachment query - any email with attachments
            return true;
        });
    } else if (queryLower.includes("today")) {
        // Date-based filter: Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        matched = allEmails.filter((e: any) => new Date(e.date) >= startOfDay);
    } else if (queryLower.includes("yesterday")) {
        // Date-based filter: Yesterday
        const startOfYesterday = new Date();
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date();
        endOfYesterday.setHours(0, 0, 0, 0);
        matched = allEmails.filter((e: any) => {
            const date = new Date(e.date);
            return date >= startOfYesterday && date < endOfYesterday;
        });
    } else if (queryLower.includes("this week")) {
        // Date-based filter: This week (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matched = allEmails.filter((e: any) => new Date(e.date) >= weekAgo);
    } else {
        // Generic search logic
        const words = queryLower.split(/\s+/).filter(w => w.length > 3);
        // Exclude trigger words and common object words from search
        const objectWords = ["emails", "email", "messages", "message", "them", "those", "that", "these", "here"];
        const searchTerms = words.filter(w => !displayTriggers.includes(w) && !objectWords.includes(w));

        if (searchTerms.length >= 1) {
            matched = allEmails.filter((e: any) => {
                const searchable = `${e.subject} ${e.from} ${e.snippet}`.toLowerCase();
                return searchTerms.length > 0 && searchTerms.every(term => searchable.includes(term));
            });
        }

        // REMOVED: Fallback to "important" emails - this caused hallucination
        // If no specific match, return empty and let the LLM respond honestly
        // Only fallback for VERY generic queries like "show my emails"
        if (matched.length === 0 && hasDisplayIntent) {
            const isVeryGenericQuery = ["show my email", "show email", "list email", "my inbox"].some(q => queryLower.includes(q));
            if (isVeryGenericQuery) {
                // Only for truly generic "show my emails" - show recent ones
                matched = allEmails.slice(0, 5);
            }
            // Otherwise return empty - let the AI explain what it couldn't find
        }
    }

    // Return top 10 (or empty if no match - this is OK, AI will respond honestly)
    return matched.slice(0, 10);
}

/**
 * Detect if user message contains an action intent
 */
function detectActionIntent(message: string): ActionType {
    const lower = message.toLowerCase();

    // Rule creation patterns
    const rulePatterns = [
        'create a rule', 'create rule', 'set up a rule', 'make a rule',
        'automation for', 'automate', 'automatically',
        'when email', 'whenever email', 'for emails from',
        'create jira tickets for', 'jira tasks for emails',
        'auto-archive', 'auto archive', 'auto-label', 'auto label',
        'always archive', 'always label', 'always forward',
    ];

    // Knowledge base patterns
    const addKnowledgePatterns = [
        'remember that', 'remember this', 'note that', 'note this',
        'add to knowledge', 'add knowledge', 'learn that', 'learn this',
        'save this info', 'save info', 'keep in mind',
    ];

    const searchKnowledgePatterns = [
        'what do you know', 'what you know', 'do you know',
        'tell me about', 'what about', 'info about',
        'search knowledge', 'check knowledge', 'find in knowledge',
    ];

    const deleteKnowledgePatterns = [
        'forget about', 'forget that', 'remove from knowledge',
        'delete from knowledge', 'remove knowledge', 'clear knowledge',
    ];

    // Jira task creation patterns  
    const jiraPatterns = [
        'create jira', 'create a jira', 'make jira', 'jira task', 'jira ticket',
        'create task', 'create a task', 'add to jira',
    ];

    // Check for knowledge base actions first
    if (addKnowledgePatterns.some(p => lower.includes(p))) {
        return 'ADD_KNOWLEDGE';
    }
    if (searchKnowledgePatterns.some(p => lower.includes(p))) {
        return 'SEARCH_KNOWLEDGE';
    }
    if (deleteKnowledgePatterns.some(p => lower.includes(p))) {
        return 'DELETE_KNOWLEDGE';
    }

    // Check for rule creation intent
    if (rulePatterns.some(p => lower.includes(p))) {
        return 'CREATE_RULE';
    }

    // Check for direct Jira task creation (for a specific email)
    if (jiraPatterns.some(p => lower.includes(p)) && !lower.includes('rule')) {
        return 'CREATE_JIRA_TASK';
    }

    return 'NONE';
}

/**
 * Parse rule parameters from natural language message
 * Returns structured data for rule creation
 */
function parseRuleFromMessage(message: string): {
    sender?: string;
    domain?: string;
    keywords?: string[];
    actionType: 'archive' | 'label' | 'forward' | 'delete' | 'mark_read' | 'create_jira';
    labelName?: string;
    forwardTo?: string;
} | null {
    const lower = message.toLowerCase();

    // Extract sender/domain
    let sender: string | undefined;
    let domain: string | undefined;

    // "from X" or "from @X"
    const fromMatch = message.match(/from\s+([^\s,]+(?:@[^\s,]+)?)/i);
    if (fromMatch) {
        const value = fromMatch[1].replace(/['"]/g, '');
        if (value.includes('@')) {
            sender = value;
        } else if (value.includes('.')) {
            domain = value;
        } else {
            sender = value; // Could be a name
        }
    }

    // Extract action type
    let actionType: 'archive' | 'label' | 'forward' | 'delete' | 'mark_read' | 'create_jira' = 'archive';

    if (/archive|move to archive/i.test(lower)) {
        actionType = 'archive';
    } else if (/label|mark as|categorize|tag/i.test(lower)) {
        actionType = 'label';
    } else if (/forward|send to/i.test(lower)) {
        actionType = 'forward';
    } else if (/delete|remove|trash/i.test(lower)) {
        actionType = 'delete';
    } else if (/mark.*read|read/i.test(lower)) {
        actionType = 'mark_read';
    } else if (/jira|task|ticket/i.test(lower)) {
        actionType = 'create_jira';
    }

    // Extract label name
    let labelName: string | undefined;
    const labelMatch = message.match(/(?:label|mark|categorize|tag)\s*(?:as|with)?\s*["']?([^"',]+)["']?/i);
    if (labelMatch) {
        labelName = labelMatch[1].trim();
    }

    // Extract forward address
    let forwardTo: string | undefined;
    const forwardMatch = message.match(/forward\s*(?:to)?\s*([^\s,]+@[^\s,]+)/i);
    if (forwardMatch) {
        forwardTo = forwardMatch[1];
    }

    // Extract keywords
    let keywords: string[] | undefined;
    const aboutMatch = message.match(/(?:about|containing|with|regarding)\s+["']?([^"']+)["']?/i);
    if (aboutMatch) {
        keywords = aboutMatch[1].split(/[,\s]+/).filter(k => k.length > 2);
    }

    // Must have at least sender/domain or keywords
    if (!sender && !domain && (!keywords || keywords.length === 0)) {
        return null;
    }

    return { sender, domain, keywords, actionType, labelName, forwardTo };
}

/**
 * Parse knowledge base content from message
 */
function parseKnowledgeFromMessage(message: string, intent: string): {
    content?: string;
    title?: string;
    searchQuery?: string;
} {
    const lower = message.toLowerCase();

    if (intent === 'ADD_KNOWLEDGE') {
        // Extract content after "remember that", "note that", etc.
        const patterns = [
            /remember\s+that\s+(.+)/i,
            /note\s+that\s+(.+)/i,
            /learn\s+that\s+(.+)/i,
            /add\s+(?:to\s+)?knowledge(?:\s*base)?[:\s]+(.+)/i,
            /save\s+(?:this\s+)?info[:\s]+(.+)/i,
            /keep\s+in\s+mind[:\s]+(.+)/i,
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                const content = match[1].trim();
                // Try to extract a title (first sentence or first 50 chars)
                const title = content.split(/[.!?]/)[0].substring(0, 50);
                return { content, title };
            }
        }
    }

    if (intent === 'SEARCH_KNOWLEDGE' || intent === 'DELETE_KNOWLEDGE') {
        // Extract search query
        const patterns = [
            /(?:what\s+)?(?:do\s+)?you\s+know\s+about\s+(.+)/i,
            /tell\s+me\s+about\s+(.+)/i,
            /info\s+about\s+(.+)/i,
            /forget\s+about\s+(.+)/i,
            /search\s+knowledge\s+(?:for\s+)?(.+)/i,
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return { searchQuery: match[1].trim() };
            }
        }
    }

    return {};
}


/**
 * Execute an action based on LLM response
 */
async function executeAction(
    actionRequest: ActionRequest,
    agentId: string,
    userId: string
): Promise<{ type: string; success: boolean; details?: any }> {
    console.log(`[Action] Executing ${actionRequest.action} with params:`, actionRequest.params);

    try {
        if (actionRequest.action === 'CREATE_RULE') {
            // Get current agent config
            const agent = await prisma.standaloneAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                return { type: 'CREATE_RULE', success: false, details: { error: 'Agent not found' } };
            }

            const agentConfig = agent.config as any;
            const existingRules = agentConfig?.automationRules || [];

            // Create new rule from params
            const newRule = {
                id: `rule_${Date.now()}`,
                name: actionRequest.params.ruleName || 'Chat-created Rule',
                enabled: true,
                conditions: actionRequest.params.conditions || [],
                action: {
                    type: actionRequest.params.actionType || 'create_jira_task',
                    config: actionRequest.params.actionConfig || {},
                },
                createdAt: new Date().toISOString(),
                createdBy: 'chat',
            };

            // Add to rules
            const updatedRules = [...existingRules, newRule];

            // Save to database
            await prisma.standaloneAgent.update({
                where: { id: agentId },
                data: {
                    config: {
                        ...agentConfig,
                        automationRules: updatedRules,
                    },
                },
            });

            console.log(`[Action] Created rule: ${newRule.name}`);
            return {
                type: 'CREATE_RULE',
                success: true,
                details: { ruleId: newRule.id, ruleName: newRule.name }
            };
        }

        if (actionRequest.action === 'CREATE_JIRA_TASK') {
            // TODO: Implement direct Jira task creation
            // For now, suggest using the rule system
            return {
                type: 'CREATE_JIRA_TASK',
                success: false,
                details: { error: 'Direct Jira task creation not yet implemented. Try creating a rule instead.' }
            };
        }

        return { type: 'NONE', success: false, details: { error: 'Unknown action' } };

    } catch (error) {
        console.error('[Action] Execution error:', error);
        return {
            type: actionRequest.action,
            success: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
    }
}

/**
 * Get predefined canned responses for common greetings/queries
 * bypassing the LLM for speed and cost
 */
function getPredefinedResponse(message: string, userName: string): { reply: string; suggestions: string[] } | null {
    const lower = message.trim().toLowerCase().replace(/[^\w\s]/g, ''); // Remove punctuation

    // 1. Simple Greetings (with fuzzy matching for repeated chars like "hii", "heyy")
    if ((/^(h+i+|h+e+y+|h+e+l+o+|h+o+l+a+|y+o+)$/.test(lower)) ||
        ['greetings', 'hiya'].includes(lower) ||
        ['good morning', 'good afternoon', 'good evening'].some(g => lower.startsWith(g))) {

        const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
        return {
            reply: getRandomTemplate('greeting', { userName, timeOfDay }),
            suggestions: ["Show unread emails", "Summarize inbox", "Show important emails"]
        };
    }

    // 2. Identity / Capabilities
    if (['who are you', 'what can you do', 'help', 'what is this'].some(p => lower.includes(p))) {
        return {
            reply: getRandomTemplate('identity', {}),
            suggestions: ["Summarize my inbox", "Show unread", "Show important emails"]
        };
    }

    // 3. Gratitude
    if (['thanks', 'thank you', 'thx', 'cool', 'great', 'awesome'].some(p => lower === p || lower.startsWith(p + ' '))) {
        return {
            reply: getRandomTemplate('gratitude', {}),
            suggestions: ["Show unread", "Summary", "Show important"]
        };
    }

    // 4. Farewells
    if (['bye', 'goodbye', 'see ya', 'cya'].some(p => lower === p)) {
        return {
            reply: getRandomTemplate('farewell', {}),
            suggestions: []
        };
    }

    // 5. Contextual responses - yes/yeah/sure
    if (['yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright'].some(p => lower === p)) {
        return {
            reply: getRandomTemplate('context_yes', {}),
            suggestions: ["Show unread", "Summarize inbox", "Show important"]
        };
    }

    // 6. Contextual responses - no/nope/nah
    if (['no', 'nope', 'nah', 'not really', 'not now', 'later'].some(p => lower === p || lower.startsWith(p))) {
        return {
            reply: getRandomTemplate('context_no', {}),
            suggestions: []
        };
    }

    // 7. More/help me/what else
    if (['more', 'what else', 'tell me more', 'options', 'menu'].some(p => lower.includes(p))) {
        return {
            reply: getRandomTemplate('context_more', {}),
            suggestions: ["Show unread", "Summary", "Important", "Action items"]
        };
    }

    // 8. Affirmations - got it/nice/neat/okay
    if (['got it', 'nice', 'neat', 'perfect', 'sounds good'].some(p => lower === p || lower.includes(p))) {
        return {
            reply: getRandomTemplate('context_okay', {}),
            suggestions: ["Show unread", "Summary", "Show important"]
        };
    }

    return null;
}

// ============================================================================
// DYNAMIC RESPONSE TEMPLATES - Natural, clean formatting (no markdown)
// ============================================================================
const RESPONSE_TEMPLATES: Record<string, string[]> = {
    greeting: [
        "Good {timeOfDay}, {userName}! 👋 I'm your email assistant. What would you like to know about your inbox?",
        "Hey {userName}! Hope you're having a great {timeOfDay}. What can I help you with?",
        "Hi {userName}! 👋 I'm here to help manage your inbox. Just tell me what you need!",
    ],
    identity: [
        "I'm your personal email assistant! 📧\n\nI can:\n• Show unread or important emails\n• Summarize your inbox\n• Find emails from specific senders\n• Show meeting invites, shipping updates, etc.\n\nJust ask me naturally!",
    ],
    gratitude: [
        "You're welcome! 😊 Anything else I can help with?",
        "Happy to help! Let me know if you need anything else.",
        "Glad I could assist! 🙌",
    ],
    farewell: [
        "Goodbye! 👋 I'll keep monitoring your inbox.",
        "Take care! 🌟 Come back anytime.",
    ],
    unread_found: [
        "📬 You have {count} unread email{s}. Here's what you've got:",
        "I found {count} unread message{s} for you! 📩",
        "You've got {count} unread email{s}:",
    ],
    unread_none: [
        "🎉 No unread emails! Your inbox is caught up.",
        "✨ Inbox zero! You're all caught up.",
    ],
    count: [
        "You have {count} {type}.",
        "I found {count} {type}.",
    ],
    summary: [
        "📊 Inbox Summary:\n\n📧 Total: {total}\n📩 Unread: {unread}\n⚡ Action: {action}\n⭐ Important: {important}\n🏷️ Promo: {promo}\n\n{insight}",
    ],
    summary_insight_urgent: ["⚠️ You have items that need attention!"],
    summary_insight_good: ["✅ Looking good! You're caught up."],
    summary_insight_many_unread: ["📚 Lots of unread. Try \"show important\" first!"],
    action_found: ["⚡ {count} item{s} need{verb} your attention:"],
    action_none: ["✅ No action needed! You're all caught up."],
    important_found: ["⭐ {count} important email{s}:"],
    important_none: ["No important emails right now."],
    sender_found: ["📧 {count} email{s} from \"{sender}\":"],
    sender_none: ["🔍 No emails from \"{sender}\" found."],
    promo: ["📢 {count} promotional email{s}:"],
    context_yes: ["Alright! What would you like me to do? 🤔", "Sure! What can I help with?"],
    context_no: ["No worries! I'm here whenever you need me. 😊"],
    context_more: ["You can ask:\n• \"Show unread\"\n• \"Summarize inbox\"\n• \"Emails from [name]\"\n• \"Meeting invites\"\n• \"Shipping updates\""],
    context_okay: ["Great! 👍 Anything else?", "Got it! What else can I help with?"],
    fallback: ["I'd love to help! 🤔 Try:\n• \"Show unread\"\n• \"Summarize inbox\"\n• \"Important emails\"\n• \"Emails from [name]\""],
};

function getRandomTemplate(key: string, vars: Record<string, any>): string {
    const templates = RESPONSE_TEMPLATES[key];
    if (!templates || templates.length === 0) return `Template "${key}" not found`;

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace(/\{(\w+)\}/g, (_, k) => {
        if (k === 's') return (vars.count === 1) ? '' : 's';
        if (k === 'verb') return (vars.count === 1) ? 's' : '';
        return vars[k] ?? '';
    });
}

/**
 * Rule-based email query handler - NO LLM NEEDED
 * Comprehensive patterns for all email-related queries
 */
function getEmailBasedResponse(
    message: string,
    emails: any[]
): { reply: string; suggestions: string[]; emails?: any[] } | null {
    const lower = message.trim().toLowerCase();

    // Unread emails
    if (/show\s*(me\s*)?(my\s*)?(all\s*)?unread|unread\s*(emails?|messages?)?|what.*unread|new\s*(emails?|mail)/i.test(lower)) {
        const unread = emails.filter(e => !e.isRead);
        if (unread.length === 0) return { reply: getRandomTemplate('unread_none', {}), suggestions: ["Show important", "Summary"] };
        return { reply: getRandomTemplate('unread_found', { count: unread.length }), emails: unread.slice(0, 15), suggestions: ["Important", "Summary"] };
    }

    // Count unread
    if (/how\s*many\s*unread|count\s*(my\s*)?unread|unread\s*count/i.test(lower)) {
        const count = emails.filter(e => !e.isRead).length;
        return { reply: getRandomTemplate('count', { count, type: `unread email${count !== 1 ? 's' : ''}` }), suggestions: ["Show unread", "Summary"] };
    }

    // Summary
    if (/summarize|summary|overview|inbox\s*status|what.*inbox/i.test(lower)) {
        const total = emails.length;
        const unread = emails.filter(e => !e.isRead).length;
        const action = emails.filter(e => e.category === 'requires_action').length;
        const important = emails.filter(e => e.priority === 'high' || e.category === 'important').length;
        const promo = emails.filter(e => e.category === 'promotional').length;
        let insight = action > 0 ? getRandomTemplate('summary_insight_urgent', {}) : (unread > 20 ? getRandomTemplate('summary_insight_many_unread', {}) : getRandomTemplate('summary_insight_good', {}));
        return { reply: getRandomTemplate('summary', { total, unread, action, important, promo, insight }), suggestions: ["Action items", "Unread", "Important"] };
    }

    // Action items
    if (/needs?\s*(my\s*)?attention|action\s*items?|urgent|requires?\s*action|to\s*do|priorities?/i.test(lower)) {
        const items = emails.filter(e => e.category === 'requires_action' || e.priority === 'high' || e.priority === 'critical');
        if (items.length === 0) return { reply: getRandomTemplate('action_none', {}), suggestions: ["Unread", "Summary"] };
        return { reply: getRandomTemplate('action_found', { count: items.length }), emails: items.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Important
    if (/show\s*(me\s*)?(my\s*)?important|important\s*(emails?)?|priority|high\s*priority/i.test(lower)) {
        const imp = emails.filter(e => e.priority === 'high' || e.priority === 'critical' || e.category === 'important' || e.category === 'requires_action');
        if (imp.length === 0) return { reply: getRandomTemplate('important_none', {}), suggestions: ["Unread", "Summary"] };
        return { reply: getRandomTemplate('important_found', { count: imp.length }), emails: imp.slice(0, 15), suggestions: ["Unread", "Action items"] };
    }

    // Promo
    if (/promo|promotional|marketing|newsletters?|subscriptions?/i.test(lower)) {
        const promo = emails.filter(e => e.category === 'promotional' || e.category === 'newsletters');
        return { reply: getRandomTemplate('promo', { count: promo.length }), emails: promo.slice(0, 15), suggestions: ["Important", "Unread"] };
    }

    // Personal
    if (/personal\s*(emails?)?/i.test(lower)) {
        const personal = emails.filter(e => e.category === 'personal');
        return { reply: `💬 ${personal.length} personal email${personal.length !== 1 ? 's' : ''}:`, emails: personal.slice(0, 15), suggestions: ["Unread", "Important"] };
    }

    // Transactional
    if (/transactional|receipts?|orders?|payments?|invoices?|bills?/i.test(lower)) {
        const trans = emails.filter(e => e.category === 'transactional');
        return { reply: `💳 ${trans.length} transactional email${trans.length !== 1 ? 's' : ''}:`, emails: trans.slice(0, 15), suggestions: ["Unread", "Important"] };
    }

    // Emails from sender
    const fromMatch = lower.match(/(?:emails?|messages?|mail)\s*(?:from|by)\s+(.+)/i) || lower.match(/from\s+([^\s]+(?:\s+[^\s]+)?)/i);
    if (fromMatch) {
        const q = fromMatch[1].trim().replace(/['"]/g, '');
        const found = emails.filter(e => e.from?.toLowerCase().includes(q) || e.sender?.toLowerCase().includes(q) || e.senderName?.toLowerCase().includes(q));
        if (found.length === 0) return { reply: getRandomTemplate('sender_none', { sender: q }), suggestions: ["Unread", "Summary"] };
        return { reply: getRandomTemplate('sender_found', { count: found.length, sender: q }), emails: found.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Search/about
    const aboutMatch = lower.match(/(?:emails?|messages?)\s*(?:about|regarding|containing|with)\s+(.+)/i) || lower.match(/search\s*(?:for)?\s+(.+)/i) || lower.match(/find\s*(?:emails?\s*)?(?:about|with)?\s+(.+)/i);
    if (aboutMatch) {
        const q = aboutMatch[1].trim().replace(/['"]/g, '');
        const found = emails.filter(e => e.subject?.toLowerCase().includes(q) || e.snippet?.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q));
        if (found.length === 0) return { reply: `No emails about "${q}".`, suggestions: ["Unread", "Summary"] };
        return { reply: `Found ${found.length} email${found.length !== 1 ? 's' : ''} about "${q}":`, emails: found.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Recent/latest
    if (/recent\s*(emails?)?|latest\s*(emails?)?|show\s*(all\s*)?(my\s*)?emails?/i.test(lower)) {
        return { reply: `📬 Your ${Math.min(15, emails.length)} most recent emails:`, emails: emails.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Total count
    if (/how\s*many\s*(total\s*)?(emails?)?|total\s*(emails?|count)?|email\s*count/i.test(lower)) {
        return { reply: getRandomTemplate('count', { count: emails.length, type: 'emails' }), suggestions: ["Unread", "Summary"] };
    }

    // Today
    if (/today|today's\s*(emails?)?/i.test(lower)) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayEmails = emails.filter(e => new Date(e.date || e.receivedAt) >= today);
        return { reply: `📅 ${todayEmails.length} email${todayEmails.length !== 1 ? 's' : ''} from today:`, emails: todayEmails.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Yesterday
    if (/yesterday/i.test(lower)) {
        const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0);
        const t = new Date(); t.setHours(0, 0, 0, 0);
        const yEmails = emails.filter(e => { const d = new Date(e.date || e.receivedAt); return d >= y && d < t; });
        return { reply: `📅 ${yEmails.length} email${yEmails.length !== 1 ? 's' : ''} from yesterday:`, emails: yEmails.slice(0, 15), suggestions: ["Today", "Summary"] };
    }

    // This week
    if (/this\s*week|week's/i.test(lower)) {
        const w = new Date(); w.setDate(w.getDate() - 7);
        const wEmails = emails.filter(e => new Date(e.date || e.receivedAt) >= w);
        return { reply: `📅 ${wEmails.length} email${wEmails.length !== 1 ? 's' : ''} this week:`, emails: wEmails.slice(0, 15), suggestions: ["Today", "Summary"] };
    }

    // Attachments
    if (/attachment|attached|with\s*attach|files?/i.test(lower)) {
        const att = emails.filter(e => e.attachments && e.attachments.length > 0);
        if (att.length === 0) return { reply: "📎 No emails with attachments.", suggestions: ["Unread", "Summary"] };
        return { reply: `📎 ${att.length} email${att.length !== 1 ? 's' : ''} with attachments:`, emails: att.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Meetings
    if (/meeting|calendar|invite|event|schedule|appointment/i.test(lower)) {
        const meets = emails.filter(e => /meeting|invite|calendar|event|schedule|rsvp/i.test(e.subject || e.snippet || ''));
        if (meets.length === 0) return { reply: "📅 No meeting invites found.", suggestions: ["Unread", "Action items"] };
        return { reply: `📅 ${meets.length} meeting-related email${meets.length !== 1 ? 's' : ''}:`, emails: meets.slice(0, 15), suggestions: ["Unread", "Action items"] };
    }

    // Any emails?
    if (/do\s*i\s*have|any\s*(new\s*)?(emails?|messages?)|got\s*any/i.test(lower)) {
        const unread = emails.filter(e => !e.isRead);
        if (unread.length === 0) return { reply: "📭 No unread emails. You're all caught up!", suggestions: ["Show all", "Summary"] };
        return { reply: `📬 Yes! ${unread.length} unread email${unread.length !== 1 ? 's' : ''}.`, emails: unread.slice(0, 5), suggestions: ["Show all unread", "Summary"] };
    }

    // Top senders
    if (/who\s*(emails?|sends?)\s*(me\s*)?most|top\s*senders?/i.test(lower)) {
        const counts: Record<string, number> = {};
        emails.forEach(e => { const s = e.senderName || e.from || 'Unknown'; counts[s] = (counts[s] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const list = top.map(([n, c], i) => `${i + 1}. ${n}: ${c}`).join('\n');
        return { reply: `📊 Top senders:\n\n${list}`, suggestions: ["Unread", "Summary"] };
    }

    // Shipping
    if (/shipping|tracking|delivery|package/i.test(lower)) {
        const ship = emails.filter(e => /ship|track|deliver|package|fedex|ups|dhl/i.test(e.subject || e.snippet || ''));
        if (ship.length === 0) return { reply: "📦 No shipping updates found.", suggestions: ["Transactional", "Summary"] };
        return { reply: `📦 ${ship.length} shipping email${ship.length !== 1 ? 's' : ''}:`, emails: ship.slice(0, 15), suggestions: ["Transactional", "Summary"] };
    }

    // Confirmation/booking
    if (/confirmation|booking|reservation/i.test(lower)) {
        const conf = emails.filter(e => /confirm|booking|reservation|booked/i.test(e.subject || e.snippet || ''));
        if (conf.length === 0) return { reply: "✅ No confirmations found.", suggestions: ["Transactional", "Summary"] };
        return { reply: `✅ ${conf.length} confirmation${conf.length !== 1 ? 's' : ''}:`, emails: conf.slice(0, 15), suggestions: ["Transactional", "Summary"] };
    }

    // Security
    if (/security|password|login\s*alert|suspicious/i.test(lower)) {
        const sec = emails.filter(e => /security|password|login|verify|2fa/i.test(e.subject || e.snippet || ''));
        if (sec.length === 0) return { reply: "🔒 No security emails. That's good!", suggestions: ["Important", "Summary"] };
        return { reply: `🔒 ${sec.length} security email${sec.length !== 1 ? 's' : ''}:`, emails: sec.slice(0, 15), suggestions: ["Important", "Summary"] };
    }

    // Job/career
    if (/job|work|interview|hiring|career|recruit/i.test(lower)) {
        const job = emails.filter(e => /job|interview|hiring|career|recruit|application|position/i.test(e.subject || e.snippet || ''));
        if (job.length === 0) return { reply: "💼 No job emails found.", suggestions: ["Important", "Summary"] };
        return { reply: `💼 ${job.length} job-related email${job.length !== 1 ? 's' : ''}:`, emails: job.slice(0, 15), suggestions: ["Important", "Summary"] };
    }

    // Reply needed
    if (/need\s*to\s*reply|reply\s*to|respond\s*to|pending\s*(reply|response)/i.test(lower)) {
        const need = emails.filter(e => e.category === 'requires_action' || e.actionRequired);
        if (need.length === 0) return { reply: "✅ No pending replies!", suggestions: ["Unread", "Summary"] };
        return { reply: `📝 ${need.length} email${need.length !== 1 ? 's' : ''} may need your response:`, emails: need.slice(0, 15), suggestions: ["Unread", "Summary"] };
    }

    // Social media
    if (/social\s*(media)?|facebook|twitter|linkedin|instagram/i.test(lower)) {
        const soc = emails.filter(e => /facebook|twitter|linkedin|instagram|youtube/i.test(e.from || e.subject || ''));
        return { reply: `📱 ${soc.length} social media email${soc.length !== 1 ? 's' : ''}:`, emails: soc.slice(0, 15), suggestions: ["Promo", "Summary"] };
    }

    // Spam check
    if (/spam|junk|scam|phishing/i.test(lower)) {
        const spam = emails.filter(e => e.category === 'automated' || /lottery|winner|claim|prize/i.test(e.subject || e.snippet || ''));
        if (spam.length === 0) return { reply: "✅ No spam detected!", suggestions: ["Promo", "Summary"] };
        return { reply: `⚠️ ${spam.length} potentially suspicious:`, emails: spam.slice(0, 15), suggestions: ["Important", "Summary"] };
    }

    // Unsubscribe
    if (/unsubscribe|stop\s*(these\s*)?emails/i.test(lower)) {
        return { reply: "📧 Look for 'Unsubscribe' link at the bottom of emails to stop receiving them.", suggestions: ["Show promo", "Summary"] };
    }

    // Meta/capabilities
    if (/how\s*(does|do)\s*(this|you)\s*work|what\s*can\s*you\s*(do|see)/i.test(lower)) {
        return { reply: "🤖 I can:\n• Find emails by sender/topic\n• Show unread/important\n• Summarize inbox\n• Find attachments\n• Show meetings/shipping\n\nJust ask!", suggestions: ["Summary", "Unread", "Action items"] };
    }

    // Catch-all with email context
    const emailKeywords = ['mail', 'message', 'inbox', 'email', 'sent', 'receive'];
    if (emailKeywords.some(k => lower.includes(k))) {
        return { reply: `📬 Quick overview:\n\n• Total: ${emails.length}\n• Unread: ${emails.filter(e => !e.isRead).length}\n• Important: ${emails.filter(e => e.priority === 'high' || e.category === 'important').length}\n\nWhat specifically would you like?`, suggestions: ["Unread", "Important", "Summary"] };
    }

    // Final fallback
    return { reply: getRandomTemplate('fallback', {}), suggestions: ["Show unread", "Summary", "Important", "Action items"] };
}
