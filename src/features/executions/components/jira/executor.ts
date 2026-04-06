import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { jiraChannel } from "@/inngest/channels/jira";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
});

type JiraData = {
    variableName?: string;
    credentialId?: string;
    resource?: string;
    operation?: string;
    projectKey?: string;
    issueIdOrKey?: string;
    issueType?: string;
    summary?: string;
    description?: string;
    assignee?: string;
    priority?: string;
    jql?: string;
    transitionId?: string;
    fields?: string;
};

type JiraCredentials = {
    domain: string;
    email: string;
    apiToken: string;
};

export const jiraExecutor: NodeExecutor<JiraData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
}) => {
    await publish(
        jiraChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    try {
        // Fetch credential
        const credential = await step.run("fetch-jira-credential", async () => {
            if (!data?.credentialId) {
                throw new NonRetriableError("No Jira credential selected");
            }

            return prisma.credential.findFirst({
                where: {
                    id: data.credentialId,
                    userId,
                },
            });
        });

        if (!credential) {
            throw new NonRetriableError("Jira credential not found");
        }

        // Decrypt and parse credentials
        const decryptedValue = await decrypt(credential.value);
        let credentials: JiraCredentials;

        try {
            credentials = JSON.parse(decryptedValue) as JiraCredentials;
        } catch (e) {
            console.error("[Jira Executor] Failed to parse credentials. Decrypted value:", decryptedValue?.substring(0, 50) + "...");
            throw new NonRetriableError(`Failed to parse Jira credentials. Expected JSON with domain, email, apiToken. Got: ${typeof decryptedValue}`);
        }

        const { domain, email, apiToken } = credentials;

        if (!domain || !email || !apiToken) {
            throw new NonRetriableError("Missing Jira credential fields (domain, email, or apiToken)");
        }

        // Build base URL - handle various domain formats
        let cleanDomain = domain.trim();
        // Remove https:// if present
        cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
        // Remove trailing slashes
        cleanDomain = cleanDomain.replace(/\/+$/, '');

        const baseUrl = cleanDomain.includes(".atlassian.net")
            ? `https://${cleanDomain}/rest/api/3`
            : `https://${cleanDomain}.atlassian.net/rest/api/3`;

        console.log("[Jira Executor] Using baseUrl:", baseUrl);
        console.log("[Jira Executor] Auth email:", email);

        // Create Basic Auth header
        const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

        // Template helper for dynamic values
        const template = (str?: string): string => {
            if (!str) return "";
            try {
                const compiled = Handlebars.compile(str);
                return compiled(context);
            } catch {
                return str;
            }
        };

        // Safe JSON parse helper
        const safeParseJson = (str?: string, fieldName?: string): Record<string, unknown> | undefined => {
            if (!str) return undefined;
            const templated = template(str);
            if (!templated) return undefined;
            try {
                return JSON.parse(templated);
            } catch (e) {
                throw new NonRetriableError(`Invalid JSON in ${fieldName || "field"}: ${e}`);
            }
        };

        // Execute API request
        const result = await step.run("jira-api-request", async () => {
            const { resource, operation } = data;

            if (!resource || !operation) {
                throw new NonRetriableError("Resource and operation are required");
            }

            // Issue operations
            if (resource === "issue") {
                if (operation === "create") {
                    const body = {
                        fields: {
                            project: { key: template(data.projectKey) },
                            summary: template(data.summary),
                            issuetype: { name: data.issueType || "Task" },
                            ...(data.description && {
                                description: {
                                    type: "doc",
                                    version: 1,
                                    content: [
                                        {
                                            type: "paragraph",
                                            content: [
                                                {
                                                    type: "text",
                                                    text: template(data.description),
                                                },
                                            ],
                                        },
                                    ],
                                },
                            }),
                            ...(data.priority && { priority: { name: data.priority } }),
                            ...(data.assignee && { assignee: { accountId: template(data.assignee) } }),
                        },
                    };

                    return ky.post(`${baseUrl}/issue`, {
                        headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                        },
                        json: body,
                    }).json();
                }

                if (operation === "get") {
                    const issueKey = template(data.issueIdOrKey);
                    return ky.get(`${baseUrl}/issue/${issueKey}`, {
                        headers: { Authorization: authHeader },
                    }).json();
                }

                if (operation === "update") {
                    const issueKey = template(data.issueIdOrKey);
                    const fields = safeParseJson(data.fields, "fields") || {};

                    // If summary is provided separately, add it to fields
                    if (data.summary) {
                        fields.summary = template(data.summary);
                    }

                    // If description is provided separately, format it
                    if (data.description) {
                        fields.description = {
                            type: "doc",
                            version: 1,
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: template(data.description),
                                        },
                                    ],
                                },
                            ],
                        };
                    }

                    await ky.put(`${baseUrl}/issue/${issueKey}`, {
                        headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                        },
                        json: { fields },
                    });

                    return { success: true, issueKey };
                }

                if (operation === "delete") {
                    const issueKey = template(data.issueIdOrKey);
                    await ky.delete(`${baseUrl}/issue/${issueKey}`, {
                        headers: { Authorization: authHeader },
                    });
                    return { success: true, deleted: issueKey };
                }

                if (operation === "search") {
                    const jql = template(data.jql);
                    return ky.post(`${baseUrl}/search`, {
                        headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                        },
                        json: { jql, maxResults: 50 },
                    }).json();
                }

                if (operation === "transition") {
                    const issueKey = template(data.issueIdOrKey);
                    const transitionId = template(data.transitionId);

                    await ky.post(`${baseUrl}/issue/${issueKey}/transitions`, {
                        headers: {
                            Authorization: authHeader,
                            "Content-Type": "application/json",
                        },
                        json: {
                            transition: { id: transitionId },
                        },
                    });

                    return { success: true, issueKey, transitionId };
                }
            }

            // Project operations
            if (resource === "project") {
                if (operation === "list") {
                    return ky.get(`${baseUrl}/project`, {
                        headers: { Authorization: authHeader },
                    }).json();
                }

                if (operation === "get") {
                    const projectKey = template(data.projectKey);
                    return ky.get(`${baseUrl}/project/${projectKey}`, {
                        headers: { Authorization: authHeader },
                    }).json();
                }
            }

            // User operations
            if (resource === "user") {
                if (operation === "search") {
                    const query = template(data.jql) || "";
                    return ky.get(`${baseUrl}/user/search`, {
                        headers: { Authorization: authHeader },
                        searchParams: { query, maxResults: 50 },
                    }).json();
                }

                if (operation === "getCurrentUser") {
                    return ky.get(`${baseUrl}/myself`, {
                        headers: { Authorization: authHeader },
                    }).json();
                }
            }

            throw new NonRetriableError(`Unsupported operation: ${resource}.${operation}`);
        });

        await publish(
            jiraChannel().status({
                nodeId,
                status: "success",
            }),
        );

        const variableName = data?.variableName || "jiraResult";
        return {
            ...context,
            [variableName]: result,
        };
    } catch (error) {
        await publish(
            jiraChannel().status({
                nodeId,
                status: "error",
            }),
        );

        if (error instanceof NonRetriableError) {
            throw error;
        }

        // Try to extract detailed error from ky HTTPError
        if (error && typeof error === 'object' && 'response' in error) {
            try {
                const response = (error as { response: Response }).response;
                const errorBody = await response.text();
                console.error("[Jira Executor] API Error Response:", errorBody);
                throw new NonRetriableError(`Jira API error (${response.status}): ${errorBody}`);
            } catch (parseError) {
                // Fall through to generic error
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new NonRetriableError(`Jira API error: ${errorMessage}`);
    }
};
