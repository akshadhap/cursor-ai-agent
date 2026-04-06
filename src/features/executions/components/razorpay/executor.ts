import ky from "ky";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { razorpayChannel } from "@/inngest/channels/razorpay";
import type { RazorpayFormValues } from "./dialog";
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

export const razorpayExecutor: NodeExecutor<RazorpayFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(razorpayChannel().status({ nodeId, status: "loading" }));

  if (!data.credentialId) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Razorpay node: Credential is required");
  }

  if (!data.variableName) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Razorpay node: variableName is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-razorpay-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Razorpay node: Credential not found");
  }

  // Decrypt and parse the credential data
  const decryptedValue = await step.run("decrypt-razorpay-credential", async () => {
    return decrypt(credential.value);
  });

  // Parse credential - expects JSON with keyId and keySecret
  let keyId: string;
  let keySecret: string;

  try {
    const parsed = JSON.parse(decryptedValue);
    keyId = parsed.keyId;
    keySecret = parsed.keySecret;
  } catch {
    throw new NonRetriableError(
      "Razorpay node: Invalid credential format. Expected JSON with keyId and keySecret"
    );
  }

  if (!keyId || !keySecret) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Razorpay node: Invalid credential (missing keyId or keySecret)");
  }

  // Auto-detect test/live mode from key prefix
  const isTestMode = keyId.startsWith("rzp_test_");
  const isLiveMode = keyId.startsWith("rzp_live_");

  if (!isTestMode && !isLiveMode) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Razorpay node: Invalid API key format. Key must start with 'rzp_test_' or 'rzp_live_'"
    );
  }

  // Create Basic Auth header
  const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const api = ky.create({
    prefixUrl: "https://api.razorpay.com/v1",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  try {
    const result = await step.run("razorpay-action", async () => {
      switch (data.action) {
        case "CREATE_PAYMENT_LINK": {
          const payload: any = {
            amount: parseInt(compileTemplate(data.amount, context), 10),
            currency: data.currency || "INR",
          };

          // Add optional fields if provided
          if (data.description) {
            payload.description = compileTemplate(data.description, context);
          }

          // Add customer details if provided
          const customer: any = {};
          if (data.customerName) {
            customer.name = compileTemplate(data.customerName, context);
          }
          if (data.customerEmail) {
            customer.email = compileTemplate(data.customerEmail, context);
          }
          if (data.customerContact) {
            customer.contact = compileTemplate(data.customerContact, context);
          }

          if (Object.keys(customer).length > 0) {
            payload.customer = customer;
          }

          return api.post("payment_links", { json: payload }).json();
        }

        case "CREATE_ORDER": {
          return api
            .post("orders", {
              json: {
                amount: parseInt(compileTemplate(data.amount, context), 10),
                currency: data.currency || "INR",
              },
            })
            .json();
        }

        case "FETCH_PAYMENT": {
          const paymentId = compileTemplate(data.paymentId, context);
          if (!paymentId) throw new NonRetriableError("Payment ID is required");
          return api.get(`payments/${paymentId}`).json();
        }

        case "FETCH_ORDER": {
          const orderId = compileTemplate(data.orderId, context);
          if (!orderId) throw new NonRetriableError("Order ID is required");
          return api.get(`orders/${orderId}`).json();
        }

        case "FETCH_PAYMENT_LINK": {
          const paymentLinkId = compileTemplate(data.paymentLinkId, context);
          if (!paymentLinkId) throw new NonRetriableError("Payment Link ID is required");
          return api.get(`payment_links/${paymentLinkId}`).json();
        }

        case "CREATE_REFUND": {
          const paymentId = compileTemplate(data.paymentId, context);
          if (!paymentId) throw new NonRetriableError("Payment ID is required for refund");

          const refundPayload: any = {};

          // Amount is optional - if not provided, full refund is processed
          if (data.refundAmount) {
            refundPayload.amount = parseInt(compileTemplate(data.refundAmount, context), 10);
          }

          return api.post(`payments/${paymentId}/refund`, { json: refundPayload }).json();
        }

        case "FETCH_REFUND": {
          const refundId = compileTemplate(data.refundId, context);
          if (!refundId) throw new NonRetriableError("Refund ID is required");
          return api.get(`refunds/${refundId}`).json();
        }

        default:
          throw new NonRetriableError(`Razorpay: Unknown action: ${data.action}`);
      }
    });

    await publish(razorpayChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(razorpayChannel().status({ nodeId, status: "error" }));

    // Handle specific HTTP errors
    if (error instanceof Error && "response" in error) {
      const httpError = error as { response?: { status?: number; statusText?: string } };

      if (httpError.response?.status === 400) {
        throw new NonRetriableError(
          `Razorpay Bad Request (400): Invalid parameters. Check your input values. ` +
          `Common issues: amount must be in paise (100 paise = ₹1), invalid IDs, or missing required fields.`
        );
      }

      if (httpError.response?.status === 401) {
        throw new NonRetriableError(
          `Razorpay Authentication Failed (401): Your API credentials are invalid or expired. ` +
          `Please verify your Key ID and Key Secret in your Razorpay Dashboard ` +
          `(Settings → API Keys). Current mode: ${isTestMode ? "Test" : "Live"}`
        );
      }

      if (httpError.response?.status === 404) {
        throw new NonRetriableError(
          `Razorpay Not Found (404): The requested resource (payment/order/refund) does not exist. ` +
          `Verify the ID is correct and belongs to the right mode (test vs live).`
        );
      }

      if (httpError.response?.status === 429) {
        throw new NonRetriableError(
          `Razorpay Rate Limit (429): Too many requests. Please slow down your API calls.`
        );
      }
    }

    throw error;
  }
};