import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { zendeskChannel } from "@/inngest/channels/zendesk";
import type { NodeExecutor } from "@/features/executions/types";
import type { ZendeskFormValues } from "./dialog";

// Helper to resolve template variables
function resolveTemplateVariables(
  value: string | undefined,
  context: Record<string, unknown>
): string | undefined {
  if (!value) return value;
  
  // Replace {{variable}} with context values
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let result: unknown = context;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return match; // Return original if path not found
      }
    }
    
    return String(result ?? match);
  });
}

// Helper to normalize special placeholder values
function normalizeValue(value: string | undefined): string | undefined {
  if (!value || value === "__all__" || value === "__default__") return undefined;
  return value;
}

// Helper to build Zendesk API URL
function buildZendeskUrl(subdomain: string, path: string): string {
  return `https://${subdomain}.zendesk.com/api/v2${path}`;
}

// Helper to make Zendesk API requests
async function zendeskRequest(
  url: string,
  credentials: { email: string; apiToken: string },
  options: RequestInit = {}
): Promise<unknown> {
  const auth = Buffer.from(`${credentials.email}/token:${credentials.apiToken}`).toString("base64");
  
  // Log for debugging (without exposing sensitive data)
  console.log('[Zendesk] Request URL:', url);
  console.log('[Zendesk] Email:', credentials.email);
  console.log('[Zendesk] API Token length:', credentials.apiToken?.length || 0);
  console.log('[Zendesk] Auth header format: Basic [base64]');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Zendesk API error (${response.status}): ${errorText}`;
    
    // Provide helpful error messages
    if (response.status === 401) {
      errorMessage = "Authentication failed. Please check your Zendesk email and API token.";
    } else if (response.status === 403) {
      errorMessage = "Permission denied. Your Zendesk user doesn't have access to perform this action.";
    } else if (response.status === 404) {
      errorMessage = "Resource not found. Please verify the ID you're using exists.";
    } else if (response.status === 422) {
      errorMessage = `Validation error: ${errorText}`;
    } else if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      errorMessage = `Rate limit exceeded. ${retryAfter ? `Please retry after ${retryAfter} seconds.` : 'Please wait before retrying.'}`;
    } else if (response.status >= 500) {
      errorMessage = `Zendesk server error (${response.status}). Please try again later.`;
    }
    
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Helper to build query string
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return filtered.length > 0 ? `?${filtered.join("&")}` : "";
}

// Helper to convert datetime-local to ISO string
function toISOString(dateTimeLocal: string | undefined): string | undefined {
  if (!dateTimeLocal) return undefined;
  return new Date(dateTimeLocal).toISOString();
}

// Parse comma-separated string to array
function parseCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

// Parse JSON safely
function parseJsonSafe(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate required field
function validateRequired(
  value: string | undefined,
  fieldName: string
): void {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
}

export const zendeskExecutor: NodeExecutor<ZendeskFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    zendeskChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // Get credentials
  if (!data.credentialId) {
    throw new Error("Zendesk credential ID is required");
  }

  if (!data.subdomain) {
    throw new Error("Zendesk subdomain is required");
  }

  const credential = await prisma.credential.findUnique({
    where: { id: data.credentialId },
  });

  if (!credential) {
    throw new Error("Zendesk credential not found");
  }

  // Parse credentials - expected format: {"email": "...", "apiToken": "..."}
  let credentials: { email: string; apiToken: string };
  const decryptedValue = await decrypt(credential.value);
  
  try {
    const parsed = JSON.parse(decryptedValue);
    credentials = {
      email: parsed.email,
      apiToken: parsed.apiToken || parsed.api_token || parsed.token,
    };
  } catch {
    // If not JSON, assume it's just the API token and we need email from somewhere
    throw new Error("Zendesk credentials must be JSON with email and apiToken fields");
  }

  if (!credentials.email || !credentials.apiToken) {
    throw new Error("Zendesk credentials must include both email and apiToken");
  }

  // Extract subdomain from various formats users might enter
  // Handles: "mycompany", "https://mycompany.zendesk.com", "mycompany.zendesk.com"
  let subdomain = data.subdomain.trim();
  
  // Remove protocol if present
  subdomain = subdomain.replace(/^https?:\/\//, '');
  
  // Remove .zendesk.com if present
  subdomain = subdomain.replace(/\.zendesk\.com.*$/, '');
  
  // Remove any trailing slashes or paths
  subdomain = subdomain.split('/')[0];
  
  if (!subdomain) {
    throw new Error("Invalid subdomain format. Please provide just the subdomain (e.g., 'mycompany')");
  }

  try {
    let result: unknown;

    switch (data.operation) {
      // ==================== TICKETS ====================
      case "list_tickets": {
        const queryParams = buildQueryString({
          per_page: data.pageSize,
          page: data.page,
          sort_by: normalizeValue(data.sortBy),
          sort_order: normalizeValue(data.sortOrder),
        });
        
        const url = buildZendeskUrl(subdomain, `/tickets.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Listed tickets",
          }),
        );
        break;
      }

      case "get_ticket": {
        if (!data.ticketId) {
          throw new Error("Ticket ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/tickets/${data.ticketId}.json`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Retrieved ticket: ${data.ticketId}`,
          }),
        );
        break;
      }

      case "create_ticket": {
        // Resolve template variables
        const subject = resolveTemplateVariables(data.ticketSubject, context);
        const description = resolveTemplateVariables(data.ticketDescription, context);
        
        // Validate required fields
        validateRequired(subject, "Ticket Subject");
        validateRequired(description, "Ticket Description");
        
        const ticketData: Record<string, unknown> = {
          subject,
          description,
        };

        if (data.ticketPriority) ticketData.priority = data.ticketPriority;
        if (data.ticketStatus) ticketData.status = data.ticketStatus;
        if (data.ticketType) ticketData.type = data.ticketType;
        if (data.ticketAssigneeId) ticketData.assignee_id = Number(data.ticketAssigneeId);
        if (data.ticketRequesterId) ticketData.requester_id = Number(data.ticketRequesterId);
        if (data.ticketGroupId) ticketData.group_id = Number(data.ticketGroupId);
        
        const tags = parseCommaSeparated(resolveTemplateVariables(data.ticketTags, context));
        if (tags) ticketData.tags = tags;
        
        const customFields = parseJsonSafe(resolveTemplateVariables(data.ticketCustomFields, context));
        if (customFields) ticketData.custom_fields = customFields;

        const url = buildZendeskUrl(subdomain, "/tickets.json");
        result = await zendeskRequest(url, credentials, {
          method: "POST",
          body: JSON.stringify({ ticket: ticketData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Created ticket: ${subject}`,
          }),
        );
        break;
      }

      case "update_ticket": {
        if (!data.ticketId) {
          throw new Error("Ticket ID is required");
        }

        const ticketData: Record<string, unknown> = {};

        if (data.ticketSubject) ticketData.subject = data.ticketSubject;
        if (data.ticketPriority) ticketData.priority = data.ticketPriority;
        if (data.ticketStatus) ticketData.status = data.ticketStatus;
        if (data.ticketType) ticketData.type = data.ticketType;
        if (data.ticketAssigneeId) ticketData.assignee_id = Number(data.ticketAssigneeId);
        if (data.ticketGroupId) ticketData.group_id = Number(data.ticketGroupId);
        
        const tags = parseCommaSeparated(data.ticketTags);
        if (tags) ticketData.tags = tags;
        
        const customFields = parseJsonSafe(data.ticketCustomFields);
        if (customFields) ticketData.custom_fields = customFields;

        // Add comment if provided
        if (data.ticketDescription) {
          ticketData.comment = {
            body: data.ticketDescription,
            public: data.ticketCommentPublic ?? true,
          };
        }

        const url = buildZendeskUrl(subdomain, `/tickets/${data.ticketId}.json`);
        result = await zendeskRequest(url, credentials, {
          method: "PUT",
          body: JSON.stringify({ ticket: ticketData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Updated ticket: ${data.ticketId}`,
          }),
        );
        break;
      }

      case "delete_ticket": {
        if (!data.ticketId) {
          throw new Error("Ticket ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/tickets/${data.ticketId}.json`);
        result = await zendeskRequest(url, credentials, { method: "DELETE" });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Deleted ticket: ${data.ticketId}`,
          }),
        );
        break;
      }

      case "add_ticket_comment": {
        if (!data.ticketId) {
          throw new Error("Ticket ID is required");
        }
        if (!data.ticketComment) {
          throw new Error("Comment is required");
        }

        const url = buildZendeskUrl(subdomain, `/tickets/${data.ticketId}.json`);
        result = await zendeskRequest(url, credentials, {
          method: "PUT",
          body: JSON.stringify({
            ticket: {
              comment: {
                body: data.ticketComment,
                public: data.ticketCommentPublic ?? true,
              },
            },
          }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Added comment to ticket: ${data.ticketId}`,
          }),
        );
        break;
      }

      case "get_ticket_comments": {
        if (!data.ticketId) {
          throw new Error("Ticket ID is required");
        }
        const queryParams = buildQueryString({
          per_page: data.pageSize,
          page: data.page,
        });
        const url = buildZendeskUrl(subdomain, `/tickets/${data.ticketId}/comments.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Retrieved comments for ticket: ${data.ticketId}`,
          }),
        );
        break;
      }

      // ==================== USERS ====================
      case "list_users": {
        const queryParams = buildQueryString({
          per_page: data.pageSize,
          page: data.page,
        });
        const url = buildZendeskUrl(subdomain, `/users.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Listed users",
          }),
        );
        break;
      }

      case "get_user": {
        if (!data.userId) {
          throw new Error("User ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/users/${data.userId}.json`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Retrieved user: ${data.userId}`,
          }),
        );
        break;
      }

      case "create_user": {
        // Resolve template variables
        const userName = resolveTemplateVariables(data.userName, context);
        const userEmail = resolveTemplateVariables(data.userEmail, context);
        
        // Validate required fields
        validateRequired(userName, "User Name");
        validateRequired(userEmail, "User Email");
        
        // Validate email format
        if (!isValidEmail(userEmail!)) {
          throw new Error("Invalid email format");
        }

        const userData: Record<string, unknown> = {
          name: userName,
          email: userEmail,
        };

        const userPhone = resolveTemplateVariables(data.userPhone, context);
        if (userPhone) userData.phone = userPhone;
        if (data.userRole) userData.role = data.userRole;
        if (data.userOrganizationId) userData.organization_id = Number(data.userOrganizationId);
        
        const userNotes = resolveTemplateVariables(data.userNotes, context);
        if (userNotes) userData.notes = userNotes;
        
        const userDetails = resolveTemplateVariables(data.userDetails, context);
        if (userDetails) userData.details = userDetails;

        const url = buildZendeskUrl(subdomain, "/users.json");
        result = await zendeskRequest(url, credentials, {
          method: "POST",
          body: JSON.stringify({ user: userData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Created user: ${userName}`,
          }),
        );
        break;
      }

      case "update_user": {
        if (!data.userId) {
          throw new Error("User ID is required");
        }

        const userData: Record<string, unknown> = {};

        if (data.userName) userData.name = data.userName;
        if (data.userEmail) userData.email = data.userEmail;
        if (data.userPhone) userData.phone = data.userPhone;
        if (data.userRole) userData.role = data.userRole;
        if (data.userOrganizationId) userData.organization_id = Number(data.userOrganizationId);
        if (data.userNotes) userData.notes = data.userNotes;
        if (data.userDetails) userData.details = data.userDetails;

        const url = buildZendeskUrl(subdomain, `/users/${data.userId}.json`);
        result = await zendeskRequest(url, credentials, {
          method: "PUT",
          body: JSON.stringify({ user: userData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Updated user: ${data.userId}`,
          }),
        );
        break;
      }

      case "delete_user": {
        if (!data.userId) {
          throw new Error("User ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/users/${data.userId}.json`);
        result = await zendeskRequest(url, credentials, { method: "DELETE" });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Deleted user: ${data.userId}`,
          }),
        );
        break;
      }

      case "search_users": {
        if (!data.searchQuery) {
          throw new Error("Search query is required");
        }
        const queryParams = buildQueryString({
          query: data.searchQuery,
          per_page: data.pageSize,
          page: data.page,
        });
        const url = buildZendeskUrl(subdomain, `/users/search.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Searched users",
          }),
        );
        break;
      }

      // ==================== ORGANIZATIONS ====================
      case "list_organizations": {
        const queryParams = buildQueryString({
          per_page: data.pageSize,
          page: data.page,
        });
        const url = buildZendeskUrl(subdomain, `/organizations.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Listed organizations",
          }),
        );
        break;
      }

      case "get_organization": {
        if (!data.organizationId) {
          throw new Error("Organization ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/organizations/${data.organizationId}.json`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Retrieved organization: ${data.organizationId}`,
          }),
        );
        break;
      }

      case "create_organization": {
        if (!data.organizationName) {
          throw new Error("Organization name is required");
        }

        const orgData: Record<string, unknown> = {
          name: data.organizationName,
        };

        const domains = parseCommaSeparated(data.organizationDomains);
        if (domains) orgData.domain_names = domains;
        
        const tags = parseCommaSeparated(data.organizationTags);
        if (tags) orgData.tags = tags;
        
        if (data.organizationNotes) orgData.notes = data.organizationNotes;
        if (data.organizationDetails) orgData.details = data.organizationDetails;

        const url = buildZendeskUrl(subdomain, "/organizations.json");
        result = await zendeskRequest(url, credentials, {
          method: "POST",
          body: JSON.stringify({ organization: orgData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Created organization",
          }),
        );
        break;
      }

      case "update_organization": {
        if (!data.organizationId) {
          throw new Error("Organization ID is required");
        }

        const orgData: Record<string, unknown> = {};

        if (data.organizationName) orgData.name = data.organizationName;
        
        const domains = parseCommaSeparated(data.organizationDomains);
        if (domains) orgData.domain_names = domains;
        
        const tags = parseCommaSeparated(data.organizationTags);
        if (tags) orgData.tags = tags;
        
        if (data.organizationNotes) orgData.notes = data.organizationNotes;
        if (data.organizationDetails) orgData.details = data.organizationDetails;

        const url = buildZendeskUrl(subdomain, `/organizations/${data.organizationId}.json`);
        result = await zendeskRequest(url, credentials, {
          method: "PUT",
          body: JSON.stringify({ organization: orgData }),
        });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Updated organization: ${data.organizationId}`,
          }),
        );
        break;
      }

      case "delete_organization": {
        if (!data.organizationId) {
          throw new Error("Organization ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/organizations/${data.organizationId}.json`);
        result = await zendeskRequest(url, credentials, { method: "DELETE" });
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Deleted organization: ${data.organizationId}`,
          }),
        );
        break;
      }

      // ==================== GROUPS ====================
      case "list_groups": {
        const queryParams = buildQueryString({
          per_page: data.pageSize,
          page: data.page,
        });
        const url = buildZendeskUrl(subdomain, `/groups.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Listed groups",
          }),
        );
        break;
      }

      case "get_group": {
        if (!data.ticketGroupId) {
          throw new Error("Group ID is required");
        }
        const url = buildZendeskUrl(subdomain, `/groups/${data.ticketGroupId}.json`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: `Retrieved group: ${data.ticketGroupId}`,
          }),
        );
        break;
      }

      // ==================== SEARCH ====================
      case "search_tickets": {
        let query = data.searchQuery || "";
        
        // Add filters to query
        const status = normalizeValue(data.filterStatus);
        const priority = normalizeValue(data.filterPriority);
        
        if (status) query += ` status:${status}`;
        if (priority) query += ` priority:${priority}`;
        if (data.filterCreatedAfter) {
          query += ` created>${toISOString(data.filterCreatedAfter)}`;
        }
        if (data.filterUpdatedAfter) {
          query += ` updated>${toISOString(data.filterUpdatedAfter)}`;
        }

        const queryParams = buildQueryString({
          query: `type:ticket ${query}`.trim(),
          per_page: data.pageSize,
          page: data.page,
          sort_by: normalizeValue(data.sortBy),
          sort_order: normalizeValue(data.sortOrder),
        });
        
        const url = buildZendeskUrl(subdomain, `/search.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Searched tickets",
          }),
        );
        break;
      }

      case "search_all": {
        if (!data.searchQuery) {
          throw new Error("Search query is required");
        }
        const queryParams = buildQueryString({
          query: data.searchQuery,
          per_page: data.pageSize,
          page: data.page,
          sort_by: normalizeValue(data.sortBy),
          sort_order: normalizeValue(data.sortOrder),
        });
        const url = buildZendeskUrl(subdomain, `/search.json${queryParams}`);
        result = await zendeskRequest(url, credentials);
        await publish(
          zendeskChannel().status({
            nodeId,
            status: "success",
            message: "Searched all resources",
          }),
        );
        break;
      }

      default:
        throw new Error(`Unknown Zendesk operation: ${data.operation}`);
    }

    await publish(
      zendeskChannel().status({
        nodeId,
        status: "success",
        message: "Zendesk operation completed successfully",
      }),
    );

    return {
      ...context,
      zendesk: {
        success: true,
        operation: data.operation,
        data: result,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await publish(
      zendeskChannel().status({
        nodeId,
        status: "error",
        message: `Zendesk operation failed: ${errorMessage}`,
      }),
    );
    throw error;
  }
};