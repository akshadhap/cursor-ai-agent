import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { calendlyChannel } from "@/inngest/channels/calendly";
import type { CalendlyFormValues } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

const CALENDLY_API_BASE = "https://api.calendly.com";

// Helper to make Calendly API requests
async function calendlyRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<unknown> {
  const url = endpoint.startsWith("http") ? endpoint : `${CALENDLY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Calendly API error (${response.status}): ${errorText}`);
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

// Helper to convert special placeholder values to undefined
function normalizeValue(value: string | undefined): string | undefined {
  if (!value || value === "__all__" || value === "__default__") return undefined;
  return value;
}

export const calendlyExecutor: NodeExecutor<CalendlyFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    calendlyChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // Validate required fields
  if (!data.credentialId) {
    await publish(
      calendlyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Calendly node: Credential ID is required");
  }

  if (!data.operation) {
    await publish(
      calendlyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Calendly node: Operation is required");
  }

  const result = await step.run(`calendly-${data.operation}`, async () => {
    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: data.credentialId },
    });

    if (!credential) {
      throw new NonRetriableError("Calendly credential not found");
    }

    const accessToken = await decrypt(credential.value);

    // Get current user info (needed for many operations)
    const getCurrentUser = async () => {
      const response = await calendlyRequest("/users/me", accessToken) as { 
        resource: { uri: string; current_organization: string } 
      };
      return response.resource;
    };

    switch (data.operation) {
      // ==================== SCHEDULED EVENTS ====================
      case "list_scheduled_events": {
        let userUri = data.userUri;
        let organizationUri = data.organizationUri;
        
        // If no user URI provided, get current user
        if (!userUri && !organizationUri) {
          const currentUser = await getCurrentUser();
          userUri = currentUser.uri;
        }
        
        const queryParams = buildQueryString({
          user: userUri,
          organization: organizationUri,
          status: normalizeValue(data.status),
          min_start_time: toISOString(data.minStartTime),
          max_start_time: toISOString(data.maxStartTime),
          count: data.count,
          page_token: data.pageToken,
          sort: normalizeValue(data.sort),
        });
        
        return await calendlyRequest(`/scheduled_events${queryParams}`, accessToken);
      }

      case "get_scheduled_event": {
        if (!data.eventUuid) {
          throw new NonRetriableError("Event UUID is required");
        }
        return await calendlyRequest(`/scheduled_events/${data.eventUuid}`, accessToken);
      }

      case "cancel_scheduled_event": {
        if (!data.eventUuid) {
          throw new NonRetriableError("Event UUID is required");
        }
        
        const body: Record<string, string> = {};
        if (data.cancelReason) {
          body.reason = data.cancelReason;
        }
        
        return await calendlyRequest(`/scheduled_events/${data.eventUuid}/cancellation`, accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      // ==================== EVENT TYPES ====================
      case "list_event_types": {
        let userUri = data.userUri;
        let organizationUri = data.organizationUri;
        
        if (!userUri && !organizationUri) {
          const currentUser = await getCurrentUser();
          userUri = currentUser.uri;
        }
        
        const queryParams = buildQueryString({
          user: userUri,
          organization: organizationUri,
          count: data.count,
          page_token: data.pageToken,
          sort: data.sort,
        });
        
        return await calendlyRequest(`/event_types${queryParams}`, accessToken);
      }

      case "get_event_type": {
        if (!data.eventTypeUuid) {
          throw new NonRetriableError("Event Type UUID is required");
        }
        return await calendlyRequest(`/event_types/${data.eventTypeUuid}`, accessToken);
      }

      // ==================== INVITEES ====================
      case "list_event_invitees": {
        if (!data.eventUuid) {
          throw new NonRetriableError("Event UUID is required");
        }
        
        const queryParams = buildQueryString({
          count: data.count,
          page_token: data.pageToken,
          sort: data.sort,
          status: data.status,
        });
        
        return await calendlyRequest(`/scheduled_events/${data.eventUuid}/invitees${queryParams}`, accessToken);
      }

      case "get_invitee": {
        if (!data.eventUuid || !data.inviteeUuid) {
          throw new NonRetriableError("Event UUID and Invitee UUID are required");
        }
        return await calendlyRequest(`/scheduled_events/${data.eventUuid}/invitees/${data.inviteeUuid}`, accessToken);
      }

      case "cancel_invitee": {
        if (!data.eventUuid || !data.inviteeUuid) {
          throw new NonRetriableError("Event UUID and Invitee UUID are required");
        }
        
        if (data.markAsNoShow) {
          // Mark as no-show
          return await calendlyRequest(`/invitees/${data.inviteeUuid}/no_show`, accessToken, {
            method: "POST",
            body: JSON.stringify({
              invitee: `https://api.calendly.com/scheduled_events/${data.eventUuid}/invitees/${data.inviteeUuid}`,
            }),
          });
        } else {
          // Cancel invitee
          const body: Record<string, string> = {};
          if (data.cancelReason) {
            body.reason = data.cancelReason;
          }
          
          return await calendlyRequest(`/scheduled_events/${data.eventUuid}/invitees/${data.inviteeUuid}/cancellation`, accessToken, {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
      }

      // ==================== USERS & ORGANIZATION ====================
      case "get_current_user": {
        return await calendlyRequest("/users/me", accessToken);
      }

      case "list_organization_members": {
        let organizationUri = data.organizationUri;
        
        if (!organizationUri) {
          const currentUser = await getCurrentUser();
          organizationUri = currentUser.current_organization;
        }
        
        const queryParams = buildQueryString({
          count: data.count,
          page_token: data.pageToken,
        });
        
        return await calendlyRequest(`/organization_memberships${queryParams}&organization=${organizationUri}`, accessToken);
      }

      // ==================== SCHEDULING LINKS ====================
      case "create_scheduling_link": {
        if (!data.eventTypeUuid) {
          throw new NonRetriableError("Event Type UUID is required");
        }
        
        const eventTypeUri = `https://api.calendly.com/event_types/${data.eventTypeUuid}`;
        
        const body = {
          max_event_count: data.maxEventCount || 1,
          owner: eventTypeUri,
          owner_type: "EventType",
        };
        
        return await calendlyRequest("/scheduling_links", accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      // ==================== AVAILABILITY ====================
      case "list_user_availability_schedules": {
        let userUri = data.userUri;
        
        if (!userUri) {
          const currentUser = await getCurrentUser();
          userUri = currentUser.uri;
        }
        
        const queryParams = buildQueryString({
          user: userUri,
        });
        
        return await calendlyRequest(`/user_availability_schedules${queryParams}`, accessToken);
      }

      case "get_user_availability_schedule": {
        if (!data.scheduleUuid) {
          throw new NonRetriableError("Schedule UUID is required");
        }
        return await calendlyRequest(`/user_availability_schedules/${data.scheduleUuid}`, accessToken);
      }

      case "list_user_busy_times": {
        let userUri = data.userUri;
        
        if (!userUri) {
          const currentUser = await getCurrentUser();
          userUri = currentUser.uri;
        }
        
        // Busy times requires start and end time
        const startTime = toISOString(data.minStartTime) || new Date().toISOString();
        const endTime = toISOString(data.maxStartTime) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const queryParams = buildQueryString({
          user: userUri,
          start_time: startTime,
          end_time: endTime,
        });
        
        return await calendlyRequest(`/user_busy_times${queryParams}`, accessToken);
      }

      // ==================== WEBHOOKS ====================
      case "list_webhook_subscriptions": {
        let userUri = data.userUri;
        let organizationUri = data.organizationUri;
        const scope = data.webhookScope || "user";
        
        if (!userUri && !organizationUri) {
          const currentUser = await getCurrentUser();
          userUri = currentUser.uri;
          organizationUri = currentUser.current_organization;
        }
        
        const queryParams = buildQueryString({
          scope,
          user: scope === "user" ? userUri : undefined,
          organization: organizationUri,
          count: data.count,
          page_token: data.pageToken,
        });
        
        return await calendlyRequest(`/webhook_subscriptions${queryParams}`, accessToken);
      }

      case "create_webhook_subscription": {
        if (!data.webhookUrl) {
          throw new NonRetriableError("Webhook URL is required");
        }
        if (!data.webhookEvents) {
          throw new NonRetriableError("Webhook events are required");
        }
        
        const currentUser = await getCurrentUser();
        const scope = data.webhookScope || "user";
        
        const events = data.webhookEvents.split(",").map(e => e.trim());
        
        const body: Record<string, unknown> = {
          url: data.webhookUrl,
          events,
          scope,
          organization: currentUser.current_organization,
        };
        
        if (scope === "user") {
          body.user = data.userUri || currentUser.uri;
        }
        
        if (data.signingKey) {
          body.signing_key = data.signingKey;
        }
        
        return await calendlyRequest("/webhook_subscriptions", accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      case "delete_webhook_subscription": {
        if (!data.webhookUuid) {
          throw new NonRetriableError("Webhook UUID is required");
        }
        return await calendlyRequest(`/webhook_subscriptions/${data.webhookUuid}`, accessToken, {
          method: "DELETE",
        });
      }

      default:
        throw new NonRetriableError(`Unknown Calendly operation: ${data.operation}`);
    }
  });

  await publish(
    calendlyChannel().status({
      nodeId,
      status: "success",
    }),
  );

  if (!data.variableName) {
    return context;
  }

  return {
    ...context,
    [data.variableName]: result,
  };
};
