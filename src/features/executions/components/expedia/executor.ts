import ky from "ky";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import crypto from "crypto";

import type { NodeExecutor } from "@/features/executions/types";
import type { ExpediaFormValues } from "./dialog";
import { expediaChannel } from "@/inngest/channels/expedia";
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

// Expedia Rapid API endpoints
const SANDBOX_BASE_URL = "https://test.ean.com";
const PRODUCTION_BASE_URL = "https://api.ean.com";

// Generate Expedia signature authentication
function generateExpediaAuth(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const toHash = apiKey + secret + timestamp;
  const signature = crypto.createHash("sha512").update(toHash).digest("hex");
  return `EAN APIKey=${apiKey},Signature=${signature},timestamp=${timestamp}`;
}

export const expediaExecutor: NodeExecutor<ExpediaFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    expediaChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      expediaChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Expedia node: Credential is required");
  }

  if (!data.variableName) {
    await publish(
      expediaChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Expedia node: variableName is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-expedia-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      expediaChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Expedia node: Credential not found");
  }

  // Decrypt and parse the credential data
  const decryptedValue = await step.run("decrypt-expedia-credential", async () => {
    return decrypt(credential.value);
  });

  // Parse credential - expects JSON with apiKey, secret, and optional useSandbox
  let apiKey: string;
  let secret: string;
  let useSandbox = true; // Default to sandbox for safety

  try {
    const parsed = JSON.parse(decryptedValue);
    apiKey = parsed.apiKey;
    secret = parsed.secret;
    if (parsed.useSandbox !== undefined) useSandbox = parsed.useSandbox;
  } catch {
    throw new NonRetriableError("Expedia node: Invalid credential format. Expected JSON with apiKey and secret");
  }

  if (!apiKey || !secret) {
    await publish(
      expediaChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Expedia node: Invalid credential (missing apiKey or secret)");
  }

  const baseUrl = useSandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
  const authHeader = generateExpediaAuth(apiKey, secret);

  const headers = {
    "Authorization": authHeader,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  try {
    const result = await step.run("expedia-api-call", async () => {
      const resource = data.resource;
      const operation = data.operation;

      // ============ PROPERTY OPERATIONS ============
      if (resource === "property") {
        if (operation === "search") {
          // Search properties (availability/rates)
          const params = new URLSearchParams();
          if (data.checkIn) params.append("checkin", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("checkout", compileTemplate(data.checkOut, context));
          if (data.adults) params.append("occupancy", compileTemplate(data.adults, context));
          if (data.rooms) params.append("rooms", compileTemplate(data.rooms, context));
          if (data.currency) params.append("currency", compileTemplate(data.currency, context));

          return ky.get(`${baseUrl}/v3/properties/availability?${params.toString()}`, { headers }).json();
        }

        if (operation === "get") {
          // Get property content/details
          if (!data.propertyId) throw new NonRetriableError("Property ID is required");
          const propertyId = compileTemplate(data.propertyId, context);
          return ky.get(`${baseUrl}/v3/properties/content?property_id=${propertyId}`, { headers }).json();
        }
      }

      // ============ AVAILABILITY OPERATIONS ============
      if (resource === "availability") {
        if (operation === "get" || operation === "search") {
          if (!data.propertyId) throw new NonRetriableError("Property ID is required");
          const params = new URLSearchParams();
          params.append("property_id", compileTemplate(data.propertyId, context));
          if (data.checkIn) params.append("checkin", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("checkout", compileTemplate(data.checkOut, context));
          if (data.adults) params.append("occupancy", compileTemplate(data.adults, context));

          return ky.get(`${baseUrl}/v3/properties/availability?${params.toString()}`, { headers }).json();
        }
      }

      // ============ PRICING OPERATIONS ============
      if (resource === "pricing") {
        if (operation === "get") {
          // Get room rates and pricing
          if (!data.propertyId) throw new NonRetriableError("Property ID is required");
          const params = new URLSearchParams();
          params.append("property_id", compileTemplate(data.propertyId, context));
          if (data.checkIn) params.append("checkin", compileTemplate(data.checkIn, context));
          if (data.checkOut) params.append("checkout", compileTemplate(data.checkOut, context));
          if (data.currency) params.append("currency", compileTemplate(data.currency, context));

          return ky.get(`${baseUrl}/v3/properties/price?${params.toString()}`, { headers }).json();
        }
      }

      // ============ BOOKING OPERATIONS ============
      if (resource === "booking") {
        if (operation === "create") {
          if (!data.propertyId || !data.checkIn || !data.checkOut) {
            throw new NonRetriableError("Property ID, Check-in, and Check-out are required");
          }
          const body = {
            property_id: compileTemplate(data.propertyId, context),
            checkin: compileTemplate(data.checkIn, context),
            checkout: compileTemplate(data.checkOut, context),
            rooms: parseInt(compileTemplate(data.rooms || "1", context), 10),
            adults: parseInt(compileTemplate(data.adults || "1", context), 10),
          };
          return ky.post(`${baseUrl}/v3/itineraries`, { headers, json: body }).json();
        }

        if (operation === "get") {
          if (!data.bookingId) throw new NonRetriableError("Booking ID is required");
          const bookingId = compileTemplate(data.bookingId, context);
          return ky.get(`${baseUrl}/v3/itineraries/${bookingId}`, { headers }).json();
        }

        if (operation === "cancel") {
          if (!data.bookingId) throw new NonRetriableError("Booking ID is required");
          const bookingId = compileTemplate(data.bookingId, context);
          return ky.delete(`${baseUrl}/v3/itineraries/${bookingId}`, { headers }).json();
        }
      }

      throw new NonRetriableError(`Expedia: Unknown resource/operation: ${resource}/${operation}`);
    });

    await publish(
      expediaChannel().status({
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
      expediaChannel().status({
        nodeId,
        status: "error",
      }),
    );

    // Handle specific HTTP errors
    if (error instanceof Error && 'response' in error) {
      const httpError = error as { response?: { status?: number } };
      if (httpError.response?.status === 401) {
        throw new NonRetriableError(
          `Expedia Authentication Failed (401): Your API credentials are invalid or expired. ` +
          `Please verify your API Key and Secret in your Expedia Partner account.`
        );
      }
      if (httpError.response?.status === 403) {
        throw new NonRetriableError(
          `Expedia Access Denied (403): You may not have the required permissions. ` +
          `Ensure your API credentials have access to the Rapid API.`
        );
      }
    }

    throw error;
  }
};
