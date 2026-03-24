import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarChannel } from "@/inngest/channels/google_calendar";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
});

const GOOGLE_CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";

type GoogleCalendarData = {
    variableName?: string;
    credentialId?: string;
    resource?: "calendar" | "event";
    operation?: string;
    calendarId?: string;
    eventId?: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    attendees?: string;
};

export const googleCalendarExecutor: NodeExecutor<GoogleCalendarData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
}) => {
    await publish(
        googleCalendarChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(
            googleCalendarChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Calendar node: Credential is required");
    }

    const credential = await step.run("fetch-google-calendar-credential", async () => {
        return prisma.credential.findFirst({
            where: {
                id: data.credentialId,
                userId,
            },
        });
    });

    if (!credential) {
        await publish(
            googleCalendarChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Calendar node: Credential not found");
    }

    // Parse credential - supports JSON with accessToken or plain token
    let accessToken: string;
    const decryptedValue = await decrypt(credential.value);

    try {
        const parsed = JSON.parse(decryptedValue);
        accessToken = parsed.accessToken || parsed.access_token || decryptedValue;
    } catch {
        // Assume it's a plain access token
        accessToken = decryptedValue;
    }

    if (!data.variableName) {
        await publish(
            googleCalendarChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Calendar node: Variable name is missing");
    }

    const resource = data.resource || "event";
    const operation = data.operation || "list";

    const template = (value?: string) => {
        if (!value) return "";
        try {
            return Handlebars.compile(value)(context);
        } catch {
            return value;
        }
    };

    const buildRequest = async () => {
        const headers = {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };

        // CALENDAR OPERATIONS
        if (resource === "calendar") {
            if (operation === "list") {
                const res = await ky.get(`${GOOGLE_CALENDAR_BASE_URL}/users/me/calendarList`, { headers });
                return await res.json();
            }

            if (operation === "get") {
                const calendarId = template(data.calendarId) || "primary";
                const res = await ky.get(`${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}`, { headers });
                return await res.json();
            }
        }

        // EVENT OPERATIONS
        if (resource === "event") {
            const calendarId = template(data.calendarId) || "primary";
            const eventsUrl = `${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`;

            if (operation === "list") {
                const res = await ky.get(eventsUrl, { headers });
                return await res.json();
            }

            if (operation === "get") {
                const eventId = template(data.eventId);
                if (!eventId) {
                    throw new NonRetriableError("Google Calendar: Event ID is required");
                }
                const res = await ky.get(`${eventsUrl}/${eventId}`, { headers });
                return await res.json();
            }

            if (operation === "create") {
                const summary = template(data.summary);
                const description = template(data.description);
                const location = template(data.location);
                const startDateTime = template(data.startDateTime);
                const endDateTime = template(data.endDateTime);
                const timeZone = template(data.timeZone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
                const attendeesStr = template(data.attendees);

                if (!summary) {
                    throw new NonRetriableError("Google Calendar: Event title (summary) is required");
                }
                if (!startDateTime || !endDateTime) {
                    throw new NonRetriableError("Google Calendar: Start and end date/time are required");
                }

                const eventBody: Record<string, unknown> = {
                    summary,
                    start: {
                        dateTime: new Date(startDateTime).toISOString(),
                        timeZone,
                    },
                    end: {
                        dateTime: new Date(endDateTime).toISOString(),
                        timeZone,
                    },
                };

                if (description) eventBody.description = description;
                if (location) eventBody.location = location;

                if (attendeesStr) {
                    const emails = attendeesStr.split(",").map(e => e.trim()).filter(Boolean);
                    eventBody.attendees = emails.map(email => ({ email }));
                }

                const res = await ky.post(eventsUrl, {
                    headers,
                    json: eventBody,
                });
                return await res.json();
            }

            if (operation === "update") {
                const eventId = template(data.eventId);
                if (!eventId) {
                    throw new NonRetriableError("Google Calendar: Event ID is required for update");
                }

                const summary = template(data.summary);
                const description = template(data.description);
                const location = template(data.location);
                const startDateTime = template(data.startDateTime);
                const endDateTime = template(data.endDateTime);
                const timeZone = template(data.timeZone) || Intl.DateTimeFormat().resolvedOptions().timeZone;

                const eventBody: Record<string, unknown> = {};
                if (summary) eventBody.summary = summary;
                if (description) eventBody.description = description;
                if (location) eventBody.location = location;

                if (startDateTime) {
                    eventBody.start = {
                        dateTime: new Date(startDateTime).toISOString(),
                        timeZone,
                    };
                }
                if (endDateTime) {
                    eventBody.end = {
                        dateTime: new Date(endDateTime).toISOString(),
                        timeZone,
                    };
                }

                const res = await ky.patch(`${eventsUrl}/${eventId}`, {
                    headers,
                    json: eventBody,
                });
                return await res.json();
            }

            if (operation === "delete") {
                const eventId = template(data.eventId);
                if (!eventId) {
                    throw new NonRetriableError("Google Calendar: Event ID is required for delete");
                }

                await ky.delete(`${eventsUrl}/${eventId}`, { headers });
                return { deleted: true, eventId };
            }
        }

        throw new NonRetriableError(
            `Google Calendar node: Unsupported resource/operation: ${resource}/${operation}`
        );
    };

    try {
        const result = await step.run(`google-calendar-${resource}-${operation}`, buildRequest);

        await publish(
            googleCalendarChannel().status({
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
            googleCalendarChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw error;
    }
};
