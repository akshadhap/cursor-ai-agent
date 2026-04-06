import { Polar } from "@polar-sh/sdk";

type PolarCustomer = {
  id: string;
  externalId: string | null;
  email: string;
  name: string | null;
};

type CustomerIdentity = {
  email: string;
  name?: string | null;
};

let cachedClient: Polar | null = null;
let cachedOrganizationId: string | null = null;

const getServer = () => {
  const server = process.env.POLAR_SERVER?.toLowerCase();
  return server === "sandbox" ? "sandbox" : "production";
};

const getAccessToken = () => {
  const server = getServer();
  
  // Use environment-specific token based on server
  if (server === "sandbox") {
    return process.env.POLAR_ACCESS_TOKEN_DEV;
  } else {
    return process.env.POLAR_ACCESS_TOKEN_PRODUCTION || process.env.POLAR_ACCESS_TOKEN;
  }
};

const isNotFoundError = (error: unknown) => {
  return (error as { statusCode?: number }).statusCode === 404;
};

const isOrganizationTokenError = (error: unknown) => {
  const detail = (error as { detail?: Array<{ type?: string }> }).detail;
  if (!Array.isArray(detail)) {
    return false;
  }
  return detail.some((entry) => entry?.type === "organization_token");
};

export const getPolarClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    // Return a null client during build time instead of throwing
    console.warn("[Polar] Warning: POLAR_ACCESS_TOKEN not set. Polar features will be disabled.");
    return null as unknown as Polar;
  }

  cachedClient = new Polar({
    accessToken,
    server: getServer(),
  });

  return cachedClient;
};

export const getPolarClientOrNull = () => {
  try {
    const token = getAccessToken();
    if (!token) {
      return null;
    }
    return getPolarClient();
  } catch (error) {
    void error;
    return null;
  }
};

export const getBaseUrl = () => {
  return process.env.POLAR_SUCCESS_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
};

export const getOrganizationId = async () => {
  if (process.env.POLAR_ORGANIZATION_ID) {
    return process.env.POLAR_ORGANIZATION_ID;
  }

  if (cachedOrganizationId) {
    return cachedOrganizationId;
  }

  const polar = getPolarClientOrNull();
  if (!polar) {
    return null;
  }

  try {
    const page = await polar.organizations.list({ limit: 1 });
    const organization = page.result.items[0];
    if (organization) {
      cachedOrganizationId = organization.id;
      return cachedOrganizationId;
    }
  } catch (error) {
    void error;
  }

  return null;
};

export const ensureCustomerByExternalId = async (
  externalCustomerId: string,
  identity: CustomerIdentity,
) => {
  const polar = getPolarClient();
  
  // Step 1: Try to get existing customer by externalId
  let existingCustomer: PolarCustomer | null = null;
  try {
    existingCustomer = (await polar.customers.getExternal({
      externalId: externalCustomerId,
    })) as PolarCustomer;
    
    // If customer exists with this externalId, update their email and name
    if (existingCustomer) {
      const updatedCustomer = (await polar.customers.update({
        id: existingCustomer.id,
        customerUpdate: {
          email: identity.email,
          name: identity.name ?? null,
        },
      })) as PolarCustomer;
      
      console.log("[Polar] Updated customer:", updatedCustomer.id, "with email:", identity.email);
      return updatedCustomer;
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  // Step 2: Customer not found by externalId - check if one exists with this email but wrong externalId
  try {
    const customersList = await polar.customers.list({
      email: identity.email,
      limit: 1,
    });
    
    if (customersList.result.items.length > 0) {
      const customerByEmail = customersList.result.items[0] as PolarCustomer;
      
      // If customer exists with different externalId, delete and recreate
      // (Polar doesn't allow updating externalId)
      if (customerByEmail.externalId && customerByEmail.externalId !== externalCustomerId) {
        console.log("[Polar] Deleting old customer with wrong externalId:", customerByEmail.externalId);
        await polar.customers.delete({ id: customerByEmail.id });
        console.log("[Polar] Deleted old customer, creating new one with correct externalId:", externalCustomerId);
      } else if (!customerByEmail.externalId) {
        // Customer exists with no externalId, just return it
        return customerByEmail;
      }
    }
  } catch (error) {
    console.warn("[Polar] Error during email search:", error);
  }

  // Step 3: Create new customer with correct externalId
  const organizationId = await getOrganizationId();
  const basePayload = {
    externalId: externalCustomerId,
    email: identity.email,
    name: identity.name ?? null,
    metadata: {
      externalCustomerId,
    },
  };

  if (!organizationId) {
    const customer = (await polar.customers.create(basePayload)) as PolarCustomer;
    console.log("[Polar] Created new customer:", customer.id);
    return customer;
  }

  try {
    const customer = (await polar.customers.create({
      ...basePayload,
      organizationId,
    })) as PolarCustomer;
    console.log("[Polar] Created new customer:", customer.id);
    return customer;
  } catch (error) {
    if (isOrganizationTokenError(error)) {
      const customer = (await polar.customers.create(basePayload)) as PolarCustomer;
      console.log("[Polar] Created new customer (no org):", customer.id);
      return customer;
    }
    throw error;
  }
};

export type CustomerStateSnapshot = {
  activeSubscriptions: Array<{
    productId: string;
    status: string;
    createdAt: Date | string;
  }>;
  activeMeters: Array<{
    meterId: string;
    balance: number;
    consumedUnits: number;
    creditedUnits: number;
  }>;
};

type CustomerMeterSummary = {
  meterId: string;
  balance: number;
  consumedUnits: number;
  creditedUnits: number;
};

export const listCustomerMeters = async (
  externalCustomerId: string,
  meterIds: string[],
) => {
  const polar = getPolarClientOrNull();
  if (!polar || meterIds.length === 0) {
    return {} as Record<string, CustomerMeterSummary>;
  }

  try {
    const page = await polar.customerMeters.list({
      externalCustomerId,
      meterId: meterIds,
      limit: 100,
    });

    return page.result.items.reduce(
      (acc, meter) => {
        acc[meter.meterId] = meter;
        return acc;
      },
      {} as Record<string, CustomerMeterSummary>,
    );
  } catch (error) {
    void error;
    return {} as Record<string, CustomerMeterSummary>;
  }
};

export const getCustomerStateByExternalId = async (
  externalCustomerId: string,
): Promise<CustomerStateSnapshot | null> => {
  const polar = getPolarClientOrNull();
  if (!polar) {
    return null;
  }

  try {
    return (await polar.customers.getStateExternal({
      externalId: externalCustomerId,
    })) as CustomerStateSnapshot;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    void error;
    return null;
  }
};