import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { fetchGmailEmails } from "@/lib/gmail/client";
import { refreshAccessToken } from "@/lib/gmail/oauth";
import {
    classifyEmailWithGroq,
    classifyWithGmailLabels,
    classifyWithSenderRules,
} from "@/lib/classification/groq-classifier";
import { calculatePriorityScore } from "@/lib/classification/priority-scorer";
import { indexEmails } from "@/lib/email-agent/embedding-service";
import {
    createJiraTaskFromEmail,
    shouldCreateJiraTask,
} from "@/lib/email-agent/jira-automation";
import { evaluateRules, executeAction, AutomationRule, EmailForRules } from "@/lib/automation";
import { createActivityLog } from "@/lib/activity-history";

/**
 * Fetch and classify emails
 * Real implementation with Gmail API + Groq classification + Auto-Refresh
 */
export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const body = await req.json();
        const { agentId, count = 25, query, freshSync = false, autoCreateJiraTasks = false, jiraProjectKey = "" } = body;

        if (!agentId) {
            return NextResponse.json(
                { error: "Agent ID is required" },
                { status: 400 }
            );
        }

        // Get agent with config
        const agent = await prisma.standaloneAgent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentData = agent.data as any;
        const agentConfig = agent.config as any;
        const existingLogs = agentConfig?.activityLogs || [];

        // Check for access token directly
        let accessToken = agentConfig?.accessToken;

        if (!accessToken) {
            return NextResponse.json(
                { error: "Gmail not connected (no access token)" },
                { status: 400 }
            );
        }

        // Fetch User Preferences for Sync Settings from Agent Config
        const syncPrefs = (agentConfig.syncPreferences as any) || {};

        // Determine Count
        // If user explicitly passed count in body (e.g. infinite scroll), use it.
        // Otherwise, if this is a fresh sync/refresh, use the preference or default.
        let fetchCount = count;
        if (freshSync && syncPrefs.emailCount && syncPrefs.syncMode === 'count') {
            fetchCount = syncPrefs.emailCount;
        }

        // Determine Query (Date Range)
        let finalQuery = query || "";

        // If no explicit query provided, and we are in "days" mode or have a date range preference
        if (!query && syncPrefs.dateRange && syncPrefs.dateRange !== 'all') {
            // Helper logic to convert range to date query
            const daysMap: Record<string, number> = { "1d": 1, "3d": 3, "1w": 7, "2w": 14, "1m": 30 };
            const daysAgo = daysMap[syncPrefs.dateRange];

            if (daysAgo) {
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                const formattedDate = date.toISOString().split('T')[0];
                const dateQuery = `after:${formattedDate}`;

                // Append to existing query or set it
                finalQuery = finalQuery ? `${finalQuery} ${dateQuery}` : dateQuery;
            }
        }

        // Respect label preferences if any (and if no specific query overrides)
        if (!query && syncPrefs.labels && Array.isArray(syncPrefs.labels) && syncPrefs.labels.length > 0 && !syncPrefs.labels.includes('INBOX')) {
            // If specific labels selected (other than just INBOX which is default usually), might need complex query
            // For now, simplicity: if they selected multiple, Gmail query doesn't support "label:A OR label:B" nicely without grouping.
            // We'll stick to INBOX default unless filter overrides.
            // But if we wanted to: `label:{${syncPrefs.labels.join(' ')}}`
        }

        // Exclude promotions if preference set
        if (syncPrefs.excludePromotions) {
            finalQuery = finalQuery ? `${finalQuery} -category:promotions` : "-category:promotions";
        }


        console.log(`[Fetch Emails] Fetching ${fetchCount} emails. Query: "${finalQuery}". SyncMode: ${syncPrefs.syncMode || 'default'}`);

        // Fetch emails from Gmail with Auto-Refresh
        let gmailEmails: any[] = [];
        try {
            const result = await fetchGmailEmails(accessToken, {
                maxResults: fetchCount,
                labelIds: ["INBOX"],
                query: finalQuery || undefined,
            });
            gmailEmails = result.emails;
        } catch (error: any) {
            // Check if error is 401 (Unauthorized)
            if (error.code === 401 || (error.message && error.message.includes("401"))) {
                console.log("Access token expired, attempting refresh...");
                const refreshToken = agentConfig?.refreshToken;

                if (!refreshToken) {
                    console.error("No refresh token available");
                    throw error; // Propagate if no refresh token
                }

                try {
                    // Refresh the token
                    const newTokens = await refreshAccessToken(refreshToken);
                    console.log("Token refreshed successfully");

                    // Update DB with new token
                    accessToken = newTokens.access_token;
                    const updatedConfig = {
                        ...agentConfig,
                        accessToken: newTokens.access_token,
                        // Update expiration if provided
                        tokenExpiresAt: newTokens.expires_in
                            ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
                            : agentConfig.tokenExpiresAt
                    };

                    await prisma.standaloneAgent.update({
                        where: { id: agentId },
                        data: { config: updatedConfig }
                    });

                    // Retry fetch with new token
                    const result = await fetchGmailEmails(accessToken, {
                        maxResults: count,
                        labelIds: ["INBOX"],
                        query: query || undefined,
                    });
                    gmailEmails = result.emails;

                } catch (refreshError) {
                    console.error("Failed to refresh token:", refreshError);
                    throw new Error("Session expired. Please reconnect Gmail.");
                }
            } else {
                throw error; // Propagate other errors
            }
        }

        // If freshSync, start fresh (no deduplication, replace all)
        // Otherwise, merge with existing for incremental updates
        const existingEmails: any[] = freshSync ? [] : (agentData.emails || []);
        const existingEmailMap = new Map(existingEmails.map(e => [e.id, e]));

        // Track emails that have already had automation rules applied (persists across fresh syncs)
        // This prevents duplicate Jira tasks/Notion pages
        const automationProcessedIds: Set<string> = new Set(agentConfig?.automationProcessedIds || []);

        // Identify new emails vs already processed
        const newGmailEmails = gmailEmails.filter(email => !existingEmailMap.has(email.id));
        const existingGmailIds = gmailEmails.filter(email => existingEmailMap.has(email.id)).map(e => e.id);

        console.log(`Found ${newGmailEmails.length} new emails, ${existingGmailIds.length} already processed`);

        // Only classify NEW emails (skip already classified ones)
        // Classification order: Gmail Labels → Sender Rules → LLM
        let gmailLabelsSuppressed = 0;
        let senderRulesSuppressed = 0;
        let llmCalled = 0;

        const newClassifiedEmails = await Promise.all(
            newGmailEmails.map(async (email) => {
                let classification;

                // Step 1: Try Gmail labels first (free, instant)
                if (email.labels && email.labels.length > 0) {
                    classification = classifyWithGmailLabels(email.labels);
                    if (classification) {
                        gmailLabelsSuppressed++;
                        console.log(`[Gmail] ${email.subject} → ${classification.category}`);
                    }
                }

                // Step 2: Try sender domain rules (free, instant)
                if (!classification) {
                    classification = classifyWithSenderRules(email.from);
                    if (classification) {
                        senderRulesSuppressed++;
                        console.log(`[Sender] ${email.subject} → ${classification.category}`);
                    }
                }

                // Step 3: Only use LLM if both methods failed
                if (!classification) {
                    try {
                        classification = await classifyEmailWithGroq({
                            id: email.id,
                            subject: email.subject,
                            from: email.from,
                            to: email.to,
                            body: email.body,
                            labels: email.labels,
                        });
                        llmCalled++;
                        console.log(`[LLM] ${email.subject} → ${classification.category}`);
                    } catch (error) {
                        console.error(`Failed to classify email ${email.id}:`, error);
                        // Fallback classification
                        classification = {
                            category: "other",
                            priority: "medium",
                            confidence: 0.5,
                            shouldCreateJiraTask: false,
                            reasoning: "Classification failed",
                        };
                    }
                }

                // Calculate smart priority score
                const priorityResult = calculatePriorityScore({
                    subject: email.subject,
                    from: email.from,
                    body: email.body || email.snippet || '',
                    snippet: email.snippet,
                    category: classification.category,
                    labels: email.labels,
                    isRead: email.isRead,
                });

                return {
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    snippet: email.snippet,
                    date: email.date,
                    category: classification.category,
                    priority: classification.priority,
                    confidence: classification.confidence,
                    isRead: email.isRead,
                    labels: email.labels,
                    attachments: email.attachments || [], // Include attachment metadata
                    syncedAt: new Date().toISOString(),
                    // Smart Intelligence fields
                    smartScore: priorityResult.score,
                    smartLevel: priorityResult.level,
                    isUrgent: priorityResult.isUrgent,
                    extractedDates: priorityResult.extractedDates,
                    monetaryAmounts: priorityResult.monetaryAmounts,
                    suggestedAction: priorityResult.suggestedAction,
                };
            })
        );

        // Merge: Keep existing emails, add new ones, update read status of existing
        const mergedEmails = [...existingEmails];

        // Add new emails
        newClassifiedEmails.forEach(email => {
            mergedEmails.push(email);
        });

        // Update read status for existing emails (from Gmail)
        // AND backfill smartScore for emails that don't have it
        gmailEmails.forEach(gmailEmail => {
            const existingIndex = mergedEmails.findIndex(e => e.id === gmailEmail.id);
            if (existingIndex !== -1) {
                mergedEmails[existingIndex].isRead = gmailEmail.isRead;
                mergedEmails[existingIndex].labels = gmailEmail.labels;

                // Backfill: Calculate smartScore for existing emails that don't have it
                // This runs locally (no LLM call) using the priority-scorer
                if (!mergedEmails[existingIndex].smartScore) {
                    const priorityResult = calculatePriorityScore({
                        subject: mergedEmails[existingIndex].subject || '',
                        from: mergedEmails[existingIndex].from || '',
                        body: mergedEmails[existingIndex].snippet || '',
                        snippet: mergedEmails[existingIndex].snippet || '',
                        category: mergedEmails[existingIndex].category,
                        labels: gmailEmail.labels,
                        isRead: gmailEmail.isRead,
                    });
                    mergedEmails[existingIndex].smartScore = priorityResult.score;
                    mergedEmails[existingIndex].smartLevel = priorityResult.level;
                    mergedEmails[existingIndex].isUrgent = priorityResult.isUrgent;
                    mergedEmails[existingIndex].extractedDates = priorityResult.extractedDates;
                    mergedEmails[existingIndex].monetaryAmounts = priorityResult.monetaryAmounts;
                    mergedEmails[existingIndex].suggestedAction = priorityResult.suggestedAction;
                }
            }
        });

        // Sort by date (newest first)
        mergedEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate category counts
        const categories: Record<string, number> = {};
        mergedEmails.forEach((email: any) => {
            categories[email.category] = (categories[email.category] || 0) + 1;
        });

        const updatedData = {
            ...agentData,
            emails: mergedEmails,
            lastSync: new Date().toISOString(),
            stats: {
                total: mergedEmails.length,
                classified: mergedEmails.length,
                gmailLabelsSuppressed: (agentData.stats?.gmailLabelsSuppressed || 0) + gmailLabelsSuppressed,
                senderRulesSuppressed: (agentData.stats?.senderRulesSuppressed || 0) + senderRulesSuppressed,
                llmCalled: (agentData.stats?.llmCalled || 0) + llmCalled,
                categories,
                newInLastSync: newClassifiedEmails.length,
            },
        };

        await prisma.standaloneAgent.update({
            where: { id: agentId },
            data: { data: updatedData },
        });

        // Index new emails to vector DB for semantic search (background, non-blocking)
        if (newClassifiedEmails.length > 0) {
            indexEmails(newClassifiedEmails, agent.userId).catch((err) => {
                console.error("Vector indexing error (non-blocking):", err);
            });
        }

        // Auto-create Jira tasks for action-required emails (if enabled)
        let jiraTasksCreated = 0;
        if (autoCreateJiraTasks && agentConfig?.jira && jiraProjectKey) {
            const jiraCredentials = agentConfig.jira;
            const actionRequiredEmails = newClassifiedEmails.filter((email: any) =>
                shouldCreateJiraTask(email, { autoCreateForActionRequired: true })
            );

            for (const email of actionRequiredEmails) {
                try {
                    const result = await createJiraTaskFromEmail(
                        email,
                        {
                            accessToken: jiraCredentials.accessToken,
                            cloudId: jiraCredentials.cloudId,
                        },
                        {
                            projectKey: jiraProjectKey,
                            issueType: "Task",
                            priority: email.priority === "high" ? "High" : "Medium",
                        }
                    );

                    if (result.success) {
                        jiraTasksCreated++;
                        console.log(`[Jira Auto] Created task ${result.issueKey} for email: ${email.subject}`);
                    }
                } catch (err) {
                    console.error(`[Jira Auto] Failed to create task for email: ${email.subject}`, err);
                }

                // Small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        // Automation Rules Execution (if any rules exist)
        let automationActionsExecuted = 0;
        const automationRules: AutomationRule[] = agentConfig?.automationRules || [];
        const enabledRules = automationRules.filter(r => r.enabled);

        let skippedCount = 0;
        if (enabledRules.length > 0 && newClassifiedEmails.length > 0) {
            console.log(`[Automation] Evaluating ${enabledRules.length} rules against ${newClassifiedEmails.length} new emails`);
            console.log(`[Automation] Already processed IDs loaded: ${automationProcessedIds.size}`);

            for (const email of newClassifiedEmails) {
                // Skip if automation already ran on this email (prevents duplicates on fresh sync)
                if (automationProcessedIds.has(email.id)) {
                    skippedCount++;
                    continue;
                }

                // Convert email to format for rule evaluation
                const emailForRules: EmailForRules = {
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    body: email.snippet || '',
                    snippet: email.snippet,
                    category: email.category,
                    priority: email.priority,
                    labels: email.labels || [],
                    date: email.date,
                };

                // Evaluate all rules against this email
                const matchingResults = evaluateRules(emailForRules, enabledRules);

                // Mark as processed if any rules matched (before executing to prevent race conditions)
                if (matchingResults.length > 0) {
                    automationProcessedIds.add(email.id);
                }

                // Execute actions for matching rules
                for (const result of matchingResults) {
                    try {
                        const actionResult = await executeAction(
                            emailForRules,
                            result.action,
                            {
                                jira: agentConfig?.jira,
                                notion: agentConfig?.notion,
                                jiraProjectKey: agentConfig?.jiraProjectKey || result.action.config?.projectKey,
                            }
                        );

                        if (actionResult.success) {
                            automationActionsExecuted++;
                            console.log(`[Automation] Rule "${result.ruleName}" executed: ${actionResult.message}`);

                            // Create activity log for the action
                            const activityType = result.action.type === 'create_jira_task' ? 'jira_task' : 'notion_page';
                            const activityTitle = result.action.type === 'create_jira_task'
                                ? `Jira Task Created: ${actionResult.data?.id || 'Task'}`
                                : `Notion Page Created: ${emailForRules.subject.substring(0, 40)}`;
                            const activityLog = createActivityLog(
                                activityType as any,
                                activityTitle,
                                `Rule "${result.ruleName}" - ${emailForRules.subject}`,
                                'success',
                                {
                                    tool: result.action.type === 'create_jira_task' ? 'jira' : 'notion',
                                    ruleName: result.ruleName,
                                    emailSubject: emailForRules.subject,
                                    resourceId: actionResult.data?.id,
                                    resourceUrl: actionResult.data?.url,
                                }
                            );

                            // Add to existing logs (will be saved with agent config)
                            existingLogs.unshift(activityLog);
                        } else {
                            console.warn(`[Automation] Rule "${result.ruleName}" failed: ${actionResult.message}`);
                        }
                    } catch (err) {
                        console.error(`[Automation] Error executing rule "${result.ruleName}":`, err);
                    }

                    // Small delay to avoid rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            console.log(`[Automation] Skipped ${skippedCount} already-processed emails, executed ${automationActionsExecuted} actions`);
        }

        // Save updated activity logs and automation tracking to agent config
        const hasNewLogs = existingLogs.length > (agentConfig?.activityLogs?.length || 0);
        const hasNewProcessedIds = automationProcessedIds.size > (agentConfig?.automationProcessedIds?.length || 0);

        if (hasNewLogs || hasNewProcessedIds) {
            // Keep only last 500 processed IDs to prevent unbounded growth
            const processedIdsArray = Array.from(automationProcessedIds).slice(-500);

            console.log(`[Activity] Saving ${existingLogs.length} logs, ${processedIdsArray.length} processed IDs`);

            // Use transaction to prevent race conditions with other config updates
            await prisma.$transaction(async (tx) => {
                // Re-read agent inside transaction to get latest config
                const currentAgent = await tx.standaloneAgent.findUnique({
                    where: { id: agentId },
                });

                if (!currentAgent) return;

                const currentConfig = (currentAgent.config as any) || {};

                await tx.standaloneAgent.update({
                    where: { id: agentId },
                    data: {
                        config: {
                            ...currentConfig,
                            activityLogs: existingLogs.slice(0, 100), // Keep only last 100
                            automationProcessedIds: processedIdsArray,
                        },
                    },
                });
            });

            console.log(`[Activity] Successfully saved activity logs to agent config`);
        }

        return NextResponse.json({
            emails: mergedEmails,
            stats: updatedData.stats,
            jiraTasksCreated,
            automationActionsExecuted,
            message: `Synced ${gmailEmails.length} emails, ${newClassifiedEmails.length} new (Gmail: ${gmailLabelsSuppressed}, Sender: ${senderRulesSuppressed}, LLM: ${llmCalled})${jiraTasksCreated > 0 ? ` | Created ${jiraTasksCreated} Jira tasks` : ''}${automationActionsExecuted > 0 ? ` | ${automationActionsExecuted} automation actions` : ''}`,
        });
    } catch (error) {
        console.error("Error fetching emails:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch emails",
            },
            { status: 500 }
        );
    }
}
