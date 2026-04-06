import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.1-8b-instant";
const MAX_LENGTH = 5000;

// Helper to Create Task in Notion
async function createTaskInNotion(task: { title: string; description: string; priority: string }) {
    const notionKey = process.env.NOTION_API_KEY;
    const dbId = process.env.NOTION_DATABASE_ID;

    if (!notionKey || !dbId) {
        return { success: false, message: "Notion not configured" };
    }

    try {
        const { Client } = require("@notionhq/client");
        const notion = new Client({ auth: notionKey });

        console.log(`Creating Notion task in DB: ${dbId}`);

        const response = await notion.pages.create({
            parent: { database_id: dbId },
            properties: {
                "Name": {
                    title: [
                        { text: { content: task.title } }
                    ]
                }
            },
            children: [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            { text: { content: task.description } }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "callout",
                    callout: {
                        rich_text: [
                            { text: { content: `Priority: ${task.priority.toUpperCase()}` } }
                        ],
                        icon: { emoji: "🚨" }
                    }
                }
            ]
        });

        return { success: true, url: response.url };
    } catch (error) {
        console.error("Notion Sync Error:", error instanceof Error ? error.message : String(error));
        return { success: false, message: error instanceof Error ? error.message : "Without specific error" };
    }
}

// Helper to Create Task in Jira
async function createTaskInJira(task: { title: string; description: string; priority: string }) {
    const domain = process.env.JIRA_DOMAIN; // e.g., "your-domain.atlassian.net"
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY; // e.g., "KAN" or "PROJ"

    if (!domain || !email || !apiToken || !projectKey) {
        return { success: false, message: "Jira credentials missing" };
    }

    try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        // Jira priority mapping (adjust based on your Jira configuration)
        // Usually: "High" -> "High", "Medium" -> "Medium", "Low" -> "Low"
        // If your Jira doesn't use these names, you might default to a standard priority ID or name.
        const priorityMap: Record<string, string> = {
            high: "High",
            medium: "Medium",
            low: "Low"
        };
        const jiraPriority = priorityMap[task.priority.toLowerCase()] || "Medium";

        const bodyData = {
            fields: {
                project: {
                    key: projectKey
                },
                summary: task.title,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: task.description
                                }
                            ]
                        }
                    ]
                },
                issuetype: {
                    name: "Task"
                },
                // Note: Priority field often requires an ID or name depending on the instance
                // priority: { name: jiraPriority } 
            }
        };

        const response = await fetch(`https://${domain}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Jira API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return { success: true, url: data.self }; // 'self' is the API link, 'key' is the issue key (e.g. PROJ-123)

    } catch (error) {
        console.error("Jira Sync Error:", error instanceof Error ? error.message : String(error));
        return { success: false, message: error instanceof Error ? error.message : "Unknown Jira error" };
    }
}

// Helper to Send Task to Slack
async function sendMessageToSlack(task: { title: string; description: string; priority: string }) {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    console.log(`[Slack Debug] Token: ${token ? "YES" : "NO"}, Channel: ${channel}`);

    if (!token || !channel) {
        return { success: false, message: "Slack credentials missing" };
    }

    try {
        const priorityEmoji = {
            high: "🔴",
            medium: "🟡",
            low: "🟢"
        }[task.priority.toLowerCase()] || "⚪";

        const message = {
            channel: channel,
            text: `New Task: ${task.title}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🆕 New Task Created",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Task:*\n${task.title}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Priority:*\n${priorityEmoji} ${task.priority.toUpperCase()}`
                        }
                    ]
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Description:*\n${task.description}`
                    }
                }
            ]
        };

        console.log("[Slack Debug] Sending payload:", JSON.stringify(message));

        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(message)
        });

        const data = await response.json();
        console.log("[Slack Debug] API Response:", JSON.stringify(data));

        if (!data.ok) {
            throw new Error(`Slack API Error: ${data.error}`);
        }

        return { success: true, url: "" };
    } catch (error) {
        console.error("Slack Sync Error:", error instanceof Error ? error.message : String(error));
        return { success: false, message: error instanceof Error ? error.message : "Unknown Slack error" };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, tool, title: providedTitle, priority: providedPriority } = body;

        console.log(`[API Debug] New Request. Text length: ${text?.length}, Tool: ${tool}, Priority: ${providedPriority}`);

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required and must be a string" },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        if (text.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_LENGTH} characters` },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a task management expert. Convert text into structured tasks.
                    
PRIORITY RULES:
- HIGH: Urgent actions, critical bugs, high-value leads, immediate deadlines, or tasks involving very significant/public figures or sensitive information.
- MEDIUM: Standard professional tasks, follow-ups, important research with clear goals, or routine profile updates.
- LOW: Background research, exploratory learning, minor updates, or tasks with no immediate impact/deadline.

Return ONLY valid JSON in this exact format:
{
  "title": "Task title",
  "description": "Detailed description",
  "priority": "low" | "medium" | "high"
}`,
                },
                {
                    role: "user",
                    content: `Create a task from this content:
Content: "${text}"
${providedTitle ? `Title: "${providedTitle}" (Use this exact title)` : ""}`,
                },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.4,
            max_tokens: 512,
        });

        const content = completion.choices[0]?.message?.content || "{}";

        let result;
        try {
            const parsed = JSON.parse(content);
            result = {
                title: providedTitle || parsed.title || "Untitled Task",
                description: parsed.description || text,
                priority: providedPriority || parsed.priority || "medium",
            };
        } catch {
            result = {
                title: providedTitle || text.slice(0, 50),
                description: text,
                priority: providedPriority || "medium",
            };
        }

        // SYNC TO SELECTED TOOL
        let syncStatus = { synced: false, message: "" };

        if (result.title) {
            let syncResult;

            // Use the tool parameter directly, default to notion if not provided
            const targetTool = (tool || "notion").toLowerCase();
            console.log(`[API Debug] Routing to tool: ${targetTool}`);

            if (targetTool === "jira") {
                syncResult = await createTaskInJira(result);
                syncStatus = {
                    synced: syncResult.success,
                    message: syncResult.success ? "Synced to Jira" : `Jira Sync Failed: ${syncResult.message}`
                };
            } else if (targetTool === "slack") {
                syncResult = await sendMessageToSlack(result);
                syncStatus = {
                    synced: syncResult.success,
                    message: syncResult.success ? "Synced to Slack" : `Slack Sync Failed: ${syncResult.message}`
                };
            } else if (targetTool === "notion") {
                syncResult = await createTaskInNotion(result);
                syncStatus = {
                    synced: syncResult.success,
                    message: syncResult.success ? "Synced to Notion" : `Notion Sync Failed: ${syncResult.message}`
                };
            } else {
                console.error(`[API Debug] Unknown tool selected: ${targetTool}`);
                syncStatus = {
                    synced: false,
                    message: `Unknown tool: ${targetTool}`
                };
            }
        }

        return NextResponse.json(
            {
                success: true,
                result,
                syncStatus,
                action: "generate-task",
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            }
        );
    } catch (error) {
        console.error("Error in generate-task API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate task" },
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                }
            }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        }
    );
}
