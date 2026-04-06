/**
 * Action Executors
 * Execute automation actions (create Jira task, save to Notion)
 */

import { RuleAction, EmailForRules, ActionConfig } from './types';
import { createPageInDatabase } from '@/lib/notion/oauth';

interface ActionResult {
    success: boolean;
    actionType: string;
    message: string;
    data?: {
        url?: string;
        id?: string;
    };
}

import { sendSlackMessage } from '@/lib/slack/api';

/**
 * Execute an action based on rule match
 */
export async function executeAction(
    email: EmailForRules,
    action: RuleAction,
    agentConfig: {
        jira?: { accessToken: string; cloudId: string; };
        notion?: { accessToken: string; };
        slack?: { accessToken: string; };
        jiraProjectKey?: string;
    }
): Promise<ActionResult> {
    switch (action.type) {
        case 'create_jira_task':
            return executeJiraAction(email, action.config, agentConfig);
        case 'save_to_notion':
            return executeNotionAction(email, action.config, agentConfig);
        case 'send_slack_message':
            return executeSlackAction(email, action.config, agentConfig);
        default:
            return {
                success: false,
                actionType: action.type,
                message: `Unknown action type: ${action.type}`
            };
    }
}

// ... existing Jira and Notion functions ...

/**
 * Send notification to Slack
 */
async function executeSlackAction(
    email: EmailForRules,
    config: ActionConfig,
    agentConfig: { slack?: { accessToken: string; } }
): Promise<ActionResult> {
    try {
        if (!agentConfig.slack?.accessToken) {
            return {
                success: false,
                actionType: 'send_slack_message',
                message: 'Slack not connected'
            };
        }

        // Default to general or use configured channel
        // Note: For MVP we might default to user's DM or a general channel if ID is missing,
        // but ideally we need a channel ID.
        // For now, let's assume we post to a default channel if not specified
        const channelId = config.slackChannelId || 'C01234567'; // Placeholder fallback if needed, better to fail if empty

        if (!config.slackChannelId) {
            // Try to find a general channel or fail
            // For now, we will fail if no channel is selected to avoid spamming wrong places
            // Or, we could skip the channel ID check if the token allows posting to default
            // But valid API requires channel.
            // Let's assume the user will pick one. If not, we return error.
            if (!config.slackChannelId) {
                // Temporary: log warning
                console.warn("No Slack channel specified for rule action");
            }
        }

        // Use the configured channel, or fallback to a known default if hardcoded for testing
        // For production, we MUST have a channel ID from config.
        const effectiveChannel = config.slackChannelId;

        if (!effectiveChannel) {
            return {
                success: false,
                actionType: 'send_slack_message',
                message: 'No Slack channel configured for this rule'
            };
        }

        // Format Slack blocks
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "📧 New Important Email"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*From:*\n${email.from}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Subject:*\n${email.subject}`
                    }
                ]
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Snippet:*\n${email.snippet}`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Priority: ${email.priority} | Category: ${email.category}`
                    }
                ]
            }
        ];

        const response = await sendSlackMessage(
            agentConfig.slack.accessToken,
            effectiveChannel,
            `New email from ${email.from}: ${email.subject}`,
            blocks
        );

        if (!response.ok) {
            return {
                success: false,
                actionType: 'send_slack_message',
                message: response.error || 'Failed to send Slack message'
            };
        }

        return {
            success: true,
            actionType: 'send_slack_message',
            message: 'Notification sent to Slack'
        };

    } catch (error) {
        console.error('Slack action error:', error);
        return {
            success: false,
            actionType: 'send_slack_message',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Create a Jira task from email
 */
async function executeJiraAction(
    email: EmailForRules,
    config: ActionConfig,
    agentConfig: {
        jira?: { accessToken: string; cloudId: string; };
        jiraProjectKey?: string;
    }
): Promise<ActionResult> {
    if (!agentConfig.jira?.accessToken || !agentConfig.jira?.cloudId) {
        return {
            success: false,
            actionType: 'create_jira_task',
            message: 'Jira not connected'
        };
    }

    const projectKey = config.projectKey || agentConfig.jiraProjectKey;
    if (!projectKey) {
        return {
            success: false,
            actionType: 'create_jira_task',
            message: 'No Jira project configured'
        };
    }

    try {
        const jiraUrl = `https://api.atlassian.com/ex/jira/${agentConfig.jira.cloudId}/rest/api/3/issue`;

        // Clean email content for Jira
        const cleanBody = (email.body || email.snippet || '')
            .replace(/<[^>]*>/g, '')
            .substring(0, 1000);

        const response = await fetch(jiraUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${agentConfig.jira.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    project: { key: projectKey },
                    summary: `[Email] ${email.subject}`,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    { type: 'text', text: `From: ${email.from}` }
                                ]
                            },
                            {
                                type: 'paragraph',
                                content: [
                                    { type: 'text', text: `Category: ${email.category}` }
                                ]
                            },
                            {
                                type: 'paragraph',
                                content: [
                                    { type: 'text', text: cleanBody }
                                ]
                            }
                        ]
                    },
                    issuetype: { name: config.issueType || 'Task' }
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AutomationAction] Jira error:', error);
            return {
                success: false,
                actionType: 'create_jira_task',
                message: `Failed to create Jira task: ${response.status}`
            };
        }

        const data = await response.json();
        const issueUrl = `https://${agentConfig.jira.cloudId}.atlassian.net/browse/${data.key}`;

        console.log('[AutomationAction] Created Jira task:', data.key);

        return {
            success: true,
            actionType: 'create_jira_task',
            message: `Created Jira task: ${data.key}`,
            data: {
                id: data.key,
                url: issueUrl
            }
        };
    } catch (error) {
        console.error('[AutomationAction] Jira error:', error);
        return {
            success: false,
            actionType: 'create_jira_task',
            message: `Jira action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Save email to Notion database
 */
async function executeNotionAction(
    email: EmailForRules,
    config: ActionConfig,
    agentConfig: {
        notion?: {
            accessToken: string;
            selectedDatabaseId?: string;
        };
    }
): Promise<ActionResult> {
    if (!agentConfig.notion?.accessToken) {
        return {
            success: false,
            actionType: 'save_to_notion',
            message: 'Notion not connected'
        };
    }

    // Use database ID from agent config (selected by user) or fall back to rule config
    const databaseId = agentConfig.notion?.selectedDatabaseId || config.databaseId;

    if (!databaseId) {
        return {
            success: false,
            actionType: 'save_to_notion',
            message: 'No Notion database selected. Go to Settings to select a database.'
        };
    }


    try {
        const result = await createPageInDatabase(
            agentConfig.notion.accessToken,
            databaseId,
            {
                title: email.subject,
                from: email.from,
                date: email.date,
                category: email.category,
                content: email.body || email.snippet || '',
                priority: email.priority
            }
        );

        console.log('[AutomationAction] Created Notion page:', result.pageId);

        return {
            success: true,
            actionType: 'save_to_notion',
            message: 'Saved to Notion',
            data: {
                id: result.pageId,
                url: result.url
            }
        };
    } catch (error) {
        console.error('[AutomationAction] Notion error:', error);
        return {
            success: false,
            actionType: 'save_to_notion',
            message: `Notion action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Execute multiple actions for matching rules
 */
export async function executeRuleActions(
    email: EmailForRules,
    actions: RuleAction[],
    agentConfig: {
        jira?: { accessToken: string; cloudId: string; };
        notion?: { accessToken: string; };
        jiraProjectKey?: string;
    }
): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
        const result = await executeAction(email, action, agentConfig);
        results.push(result);
    }

    return results;
}
