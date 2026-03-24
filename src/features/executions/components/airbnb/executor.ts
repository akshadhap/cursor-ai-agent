import ky from "ky";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import type { AirbnbFormValues } from "./dialog";
import { airbnbChannel } from "@/inngest/channels/airbnb";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// Register JSON helper for Handlebars
Handlebars.registerHelper("json", (ctx) => {
  return new Handlebars.SafeString(JSON.stringify(ctx, null, 2));
});

// Helper to compile handlebars templates
const compileTemplate = (template: string | undefined, context: Record<string, unknown>): string => {
  if (!template || template.trim().length === 0) return "";
  const compiled = Handlebars.compile(template)(context);
  return decode(compiled);
};

// Default API base URL - can be configured if user gets API access
const DEFAULT_BASE_URL = "https://api.airbnb.com/v2";

export const airbnbExecutor: NodeExecutor<AirbnbFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    airbnbChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      airbnbChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airbnb node: Credential is required");
  }

  if (!data.variableName) {
    await publish(
      airbnbChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airbnb node: variableName is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-airbnb-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      airbnbChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airbnb node: Credential not found");
  }

  // Decrypt and parse the credential data
  const decryptedValue = await step.run("decrypt-airbnb-credential", async () => {
    return decrypt(credential.value);
  });

  // Parse credential - can be JSON with apiKey and optional baseUrl, or just api key
  let apiKey: string;
  let baseUrl: string = DEFAULT_BASE_URL;

  try {
    const parsed = JSON.parse(decryptedValue);
    apiKey = parsed.apiKey || parsed.accessToken || decryptedValue;
    if (parsed.baseUrl) baseUrl = parsed.baseUrl;
  } catch {
    // Not JSON, treat as plain API key
    apiKey = decryptedValue;
  }

  if (!apiKey) {
    await publish(
      airbnbChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Airbnb node: Invalid credential (missing API key)");
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const result = await step.run("airbnb-api-call", async () => {
      const resource = data.resource;
      const operation = data.operation;

      // ============ LISTING OPERATIONS ============
      if (resource === "listing") {
        if (operation === "search") {
          const params = new URLSearchParams();
          if (data.checkIn) params.append("check_in", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("check_out", compileTemplate(data.checkOut, context));
          if (data.guests) params.append("guests", compileTemplate(data.guests, context));
          if (data.location) params.append("location", compileTemplate(data.location, context));
          return ky.get(`${baseUrl}/listings/search?${params.toString()}`, { headers }).json();
        }

        if (operation === "get") {
          if (!data.listingId) throw new NonRetriableError("Listing ID is required");
          const listingId = compileTemplate(data.listingId, context);
          return ky.get(`${baseUrl}/listings/${listingId}`, { headers }).json();
        }
      }

      // ============ AVAILABILITY OPERATIONS ============
      if (resource === "availability") {
        if (operation === "get") {
          if (!data.listingId) throw new NonRetriableError("Listing ID is required");
          const listingId = compileTemplate(data.listingId, context);
          const params = new URLSearchParams();
          params.append("listing_id", listingId);
          if (data.checkIn) params.append("start_date", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("end_date", compileTemplate(data.checkOut, context));
          return ky.get(`${baseUrl}/calendars/${listingId}?${params.toString()}`, { headers }).json();
        }
      }

      // ============ RESERVATION OPERATIONS ============
      if (resource === "reservation") {
        if (operation === "get") {
          if (!data.reservationId) throw new NonRetriableError("Reservation ID is required");
          const reservationId = compileTemplate(data.reservationId, context);
          return ky.get(`${baseUrl}/reservations/${reservationId}`, { headers }).json();
        }

        if (operation === "create") {
          if (!data.listingId || !data.checkIn || !data.checkOut) {
            throw new NonRetriableError("Listing ID, Check-in, and Check-out are required");
          }
          const body = {
            listing_id: compileTemplate(data.listingId, context),
            check_in: compileTemplate(data.checkIn, context),
            check_out: compileTemplate(data.checkOut, context),
            guests: parseInt(compileTemplate(data.guests || "1", context), 10),
          };
          return ky.post(`${baseUrl}/reservations`, { headers, json: body }).json();
        }

        if (operation === "update") {
          if (!data.reservationId) throw new NonRetriableError("Reservation ID is required");
          const reservationId = compileTemplate(data.reservationId, context);
          const body: Record<string, unknown> = {};
          if (data.checkIn) body.check_in = compileTemplate(data.checkIn, context);
          if (data.checkOut) body.check_out = compileTemplate(data.checkOut, context);
          if (data.guests) body.guests = parseInt(compileTemplate(data.guests, context), 10);
          return ky.put(`${baseUrl}/reservations/${reservationId}`, { headers, json: body }).json();
        }

        if (operation === "cancel") {
          if (!data.reservationId) throw new NonRetriableError("Reservation ID is required");
          const reservationId = compileTemplate(data.reservationId, context);
          return ky.post(`${baseUrl}/reservations/${reservationId}/cancel`, { headers }).json();
        }
      }

      // ============ PRICING OPERATIONS ============
      if (resource === "pricing") {
        if (operation === "get") {
          if (!data.listingId) throw new NonRetriableError("Listing ID is required");
          const listingId = compileTemplate(data.listingId, context);
          const params = new URLSearchParams();
          params.append("listing_id", listingId);
          if (data.checkIn) params.append("check_in", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("check_out", compileTemplate(data.checkOut, context));
          if (data.guests) params.append("guests", compileTemplate(data.guests, context));
          return ky.get(`${baseUrl}/pricing?${params.toString()}`, { headers }).json();
        }
      }

      throw new NonRetriableError(`Airbnb: Unknown resource/operation: ${resource}/${operation}`);
    });

    await publish(
      airbnbChannel().status({
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
      airbnbChannel().status({
        nodeId,
        status: "error",
      }),
    );

    // Handle specific HTTP errors
    if (error instanceof Error && 'response' in error) {
      const httpError = error as { response?: { status?: number } };
      if (httpError.response?.status === 401) {
        throw new NonRetriableError(
          `Airbnb Authentication Failed (401): Your API key is invalid or expired. ` +
          `Please verify your Airbnb credentials. ` +
          `Note: Airbnb API access requires partner approval.`
        );
      }
      if (httpError.response?.status === 403) {
        throw new NonRetriableError(
          `Airbnb Access Denied (403): You may not have partner API access. ` +
          `Contact Airbnb to apply for API access.`
        );
      }
    }

    throw error;
  }
};
