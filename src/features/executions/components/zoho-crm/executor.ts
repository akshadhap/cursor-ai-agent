import ky from "ky";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { zohoCrmChannel } from "@/inngest/channels/zoho-crm";
import type { ZohoFormValues } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// Map resource names to Zoho API module names
const RESOURCE_TO_MODULE: Record<string, string> = {
    account: "Accounts",
    contact: "Contacts",
    deal: "Deals",
    lead: "Leads",
    product: "Products",
    task: "Tasks",
    note: "Notes",
    call: "Calls",
    event: "Events",
};

// Map region codes to Zoho OAuth domains
const REGION_TO_DOMAIN: Record<string, string> = {
    com: "zoho.com",
    eu: "zoho.eu",
    in: "zoho.in",
    "com.au": "zoho.com.au",
    "com.cn": "zoho.com.cn",
    jp: "zoho.jp",
};

// Token cache to prevent rate limiting
interface CachedToken {
    accessToken: string;
    expiresAt: number; // Unix timestamp in ms
}

const tokenCache = new Map<string, CachedToken>();

// Token TTL: 55 minutes (Zoho tokens expire in 1 hour, refresh 5 min early)
const TOKEN_TTL_MS = 55 * 60 * 1000;

// Helper to get Zoho access token with caching
async function getAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    region: string = "com"
): Promise<string> {
    // Create cache key from credentials
    const cacheKey = `${clientId}:${region}`;

    // Check if we have a valid cached token
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        console.log("Using cached Zoho access token");
        return cached.accessToken;
    }

    // Token expired or not cached, refresh it
    const domain = REGION_TO_DOMAIN[region] || "zoho.com";

    try {
        console.log("Refreshing Zoho access token...");
        const res = await ky.post(
            `https://accounts.${domain}/oauth/v2/token`,
            {
                body: new URLSearchParams({
                    refresh_token: refreshToken,
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "refresh_token",
                }),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        ).json<{ access_token: string; expires_in?: number; error?: string }>();

        if (!res.access_token) {
            throw new Error(`No access token in response: ${JSON.stringify(res)}`);
        }

        // Cache the token
        const expiresIn = res.expires_in || 3600; // Default 1 hour
        tokenCache.set(cacheKey, {
            accessToken: res.access_token,
            expiresAt: Date.now() + (expiresIn * 1000) - (5 * 60 * 1000), // Expire 5 min early
        });

        console.log(`Zoho token cached, expires in ${expiresIn} seconds`);
        return res.access_token;
    } catch (error) {
        console.error("Zoho token refresh error:", error);
        if (error instanceof Error && 'response' in error) {
            const response = (error as { response: Response }).response;
            const text = await response.text();
            console.error("Zoho token error response:", text);
            throw new Error(`Token refresh failed: ${text}`);
        }
        throw error;
    }
}

export const zohoExecutor: NodeExecutor<ZohoFormValues> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
}) => {
    try {
        await publish(zohoCrmChannel().status({ nodeId, status: "loading" }));

        // Validate credentialId
        if (!data.credentialId) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError("Zoho node: Credential is required");
        }

        if (!data.variableName) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError("Zoho node: Variable name is missing");
        }

        if (!data.resource || !data.operation) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError("Zoho node: Resource and Operation are required");
        }

        // Fetch credential from database
        const credential = await step.run("fetch-zoho-credential", async () => {
            return prisma.credential.findUnique({
                where: { id: data.credentialId },
            });
        });

        if (!credential) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError(
                `Zoho node: Credential with ID ${data.credentialId} not found`,
            );
        }

        // Decrypt and parse credential value
        const decryptedValue = await decrypt(credential.value);
        let credData: {
            clientId?: string;
            clientSecret?: string;
            refreshToken?: string;
            region?: string;
        };

        try {
            credData = JSON.parse(decryptedValue);
        } catch (parseError) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError(`Zoho node: Invalid credential format`);
        }

        const { clientId, clientSecret, refreshToken, region = "com" } = credData;

        if (!clientId || !clientSecret || !refreshToken) {
            await publish(zohoCrmChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError(
                "Zoho node: Missing clientId, clientSecret, or refreshToken in credential",
            );
        }

        // Get access token
        const token = await getAccessToken(clientId, clientSecret, refreshToken, region);

        // Determine API domain based on region
        const zohoDomain = REGION_TO_DOMAIN[region] || "zoho.com";
        const apiDomain = zohoDomain.replace("zoho", "zohoapis");

        const api = ky.create({
            prefixUrl: `https://www.${apiDomain}/crm/v2`,
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                "Content-Type": "application/json",
            },
        });

        const moduleName = RESOURCE_TO_MODULE[data.resource] || data.resource;

        // Build payload from additional fields
        const payload: Record<string, string> = {};
        if (data.additionalFields && data.additionalFields.length > 0) {
            for (const field of data.additionalFields) {
                if (field.key && field.value) {
                    // Process Handlebars templates in values
                    const processedValue = Handlebars.compile(field.value)(context);
                    payload[field.key] = processedValue;
                }
            }
        }

        // Process record ID if provided
        const recordId = data.recordId
            ? Handlebars.compile(data.recordId)(context)
            : undefined;

        const result = await step.run("zoho-crm-call", async () => {
            switch (data.operation) {
                case "create":
                    return api.post(moduleName, {
                        json: { data: [payload] }
                    }).json();

                case "update":
                    if (!recordId) {
                        throw new NonRetriableError("Zoho node: Record ID is required for update");
                    }
                    return api.put(`${moduleName}/${recordId}`, {
                        json: { data: [payload] },
                    }).json();

                case "get":
                    if (!recordId) {
                        throw new NonRetriableError("Zoho node: Record ID is required for get");
                    }
                    return api.get(`${moduleName}/${recordId}`).json();

                case "getAll":
                    const searchParams: Record<string, string> = {};
                    if (Object.keys(payload).length > 0) {
                        // Use payload as search criteria
                        Object.assign(searchParams, payload);
                    }
                    return api.get(moduleName, { searchParams }).json();

                case "delete":
                    if (!recordId) {
                        throw new NonRetriableError("Zoho node: Record ID is required for delete");
                    }
                    return api.delete(`${moduleName}/${recordId}`).json();

                case "upsert":
                    return api.post(`${moduleName}/upsert`, {
                        json: { data: [payload] },
                    }).json();

                default:
                    throw new NonRetriableError(`Zoho node: Unknown operation "${data.operation}"`);
            }
        });

        await publish(zohoCrmChannel().status({ nodeId, status: "success" }));

        return {
            ...context,
            [data.variableName]: result,
        };
    } catch (err) {
        await publish(zohoCrmChannel().status({ nodeId, status: "error" }));

        if (err instanceof NonRetriableError) {
            throw err;
        }

        throw new NonRetriableError(
            `Zoho node failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
    }
};
