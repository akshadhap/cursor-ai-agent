import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { zoomChannel } from "@/inngest/channels/zoom";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});

type ZoomData = {
  variableName?: string;
  credentialId?: string;
  operation?: string;
  meetingId?: string;
  meetingTopic?: string;
  meetingDescription?: string;
  duration?: string;
  startTime?: string;
  timezone?: string;
  pageSize?: number;
};

// Helper to get Zoom access token
async function getZoomAccessToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await ky.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const tokenData = await tokenRes.json<{ access_token: string }>();
  return tokenData.access_token;
}

export const zoomExecutor: NodeExecutor<ZoomData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  try {
    await publish(
      zoomChannel().status({
        nodeId,
        status: "loading",
      }),
    );

    // Validate credentialId
    if (!data.credentialId) {
      await publish(
        zoomChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError("Zoom node: Credential is required");
    }

    if (!data.variableName) {
      await publish(
        zoomChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError("Zoom node: Variable name is missing");
    }

    const operation = data.operation || "create_meeting";

    // Fetch credential from database
    const credential = await step.run("fetch-zoom-credential", async () => {
      return prisma.credential.findUnique({
        where: { id: data.credentialId },
      });
    });

    if (!credential) {
      await publish(
        zoomChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError(
        `Zoom node: Credential with ID ${data.credentialId} not found`,
      );
    }

    // Decrypt and parse credential value
    const decryptedValue = await decrypt(credential.value);
    let credData: { accountId?: string; clientId?: string; clientSecret?: string };

    try {
      credData = JSON.parse(decryptedValue);
    } catch (parseError) {
      await publish(
        zoomChannel().status({
          nodeId,
          status: "error",
        }),
      );
      const preview = decryptedValue.substring(0, 100);
      throw new NonRetriableError(`Zoom node: Invalid credential format. Value preview: ${preview}...`);
    }

    const { accountId, clientId, clientSecret } = credData;

    if (!accountId || !clientId || !clientSecret) {
      await publish(
        zoomChannel().status({
          nodeId,
          status: "error",
        }),
      );
      throw new NonRetriableError(
        "Zoom node: Missing accountId, clientId, or clientSecret in credential",
      );
    }

    // Execute operation
    const result = await step.run(`zoom-${operation}`, async () => {
      const accessToken = await getZoomAccessToken(accountId, clientId, clientSecret);
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      switch (operation) {
        case "create_meeting": {
          if (!data.meetingTopic || !data.startTime || !data.duration) {
            throw new NonRetriableError(
              "Zoom node: meetingTopic, startTime and duration are required for create",
            );
          }

          const compiledTopic = Handlebars.compile(data.meetingTopic)(context);
          const compiledDescription = data.meetingDescription
            ? Handlebars.compile(data.meetingDescription)(context)
            : "";

          const startTime = new Date(data.startTime).toISOString();

          const meetingRes = await ky.post("https://api.zoom.us/v2/users/me/meetings", {
            headers,
            json: {
              topic: compiledTopic,
              type: 2, // Scheduled meeting
              start_time: startTime,
              duration: parseInt(data.duration),
              timezone: data.timezone || "UTC",
              agenda: compiledDescription,
              settings: {
                host_video: true,
                participant_video: true,
                join_before_host: true,
                mute_upon_entry: false,
                waiting_room: false,
              },
            },
          });

          const meeting = await meetingRes.json<Record<string, unknown>>();
          return {
            zoom: {
              id: meeting.id,
              join_url: meeting.join_url,
              start_url: meeting.start_url,
              start_time: meeting.start_time,
              duration: meeting.duration,
              topic: meeting.topic,
              status: "created",
            },
          };
        }

        case "get_meeting": {
          if (!data.meetingId) {
            throw new NonRetriableError("Zoom node: meetingId is required for get");
          }

          const meetingId = Handlebars.compile(data.meetingId)(context);
          const meetingRes = await ky.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
            headers,
          });

          const meeting = await meetingRes.json<Record<string, unknown>>();
          return {
            zoom: {
              ...meeting,
              status: "retrieved",
            },
          };
        }

        case "update_meeting": {
          if (!data.meetingId) {
            throw new NonRetriableError("Zoom node: meetingId is required for update");
          }

          const meetingId = Handlebars.compile(data.meetingId)(context);

          const updatePayload: Record<string, unknown> = {};

          if (data.meetingTopic) {
            updatePayload.topic = Handlebars.compile(data.meetingTopic)(context);
          }
          if (data.meetingDescription) {
            updatePayload.agenda = Handlebars.compile(data.meetingDescription)(context);
          }
          if (data.duration) {
            updatePayload.duration = parseInt(data.duration);
          }
          if (data.startTime) {
            updatePayload.start_time = new Date(data.startTime).toISOString();
          }
          if (data.timezone) {
            updatePayload.timezone = data.timezone;
          }

          await ky.patch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
            headers,
            json: updatePayload,
          });

          // Fetch updated meeting details
          const meetingRes = await ky.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
            headers,
          });

          const meeting = await meetingRes.json<Record<string, unknown>>();
          return {
            zoom: {
              ...meeting,
              status: "updated",
            },
          };
        }

        case "delete_meeting": {
          if (!data.meetingId) {
            throw new NonRetriableError("Zoom node: meetingId is required for delete");
          }

          const meetingId = Handlebars.compile(data.meetingId)(context);

          await ky.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
            headers,
          });

          return {
            zoom: {
              id: meetingId,
              status: "deleted",
            },
          };
        }

        case "list_meetings": {
          const pageSize = data.pageSize || 30;

          const meetingsRes = await ky.get("https://api.zoom.us/v2/users/me/meetings", {
            headers,
            searchParams: {
              page_size: Math.min(pageSize, 300),
              type: "scheduled",
            },
          });

          const meetingsData = await meetingsRes.json<{
            meetings: Record<string, unknown>[];
            page_count: number;
            page_size: number;
            total_records: number;
          }>();

          return {
            zoom: {
              meetings: meetingsData.meetings,
              page_count: meetingsData.page_count,
              page_size: meetingsData.page_size,
              total_records: meetingsData.total_records,
              status: "listed",
            },
          };
        }

        default:
          throw new NonRetriableError(`Zoom node: Unknown operation "${operation}"`);
      }
    });

    await publish(
      zoomChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(
      zoomChannel().status({
        nodeId,
        status: "error",
      }),
    );

    if (error instanceof NonRetriableError) {
      throw error;
    }

    throw new NonRetriableError(
      `Zoom node failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
