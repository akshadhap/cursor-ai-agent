import { NextResponse } from "next/server";
import { PRODUCT_KEYS, TIER_KEYS, ProductKey, TierKey, PRODUCT_CATALOG } from "@/lib/billing/catalog";
import { getPolarClient, getOrganizationId, ensureCustomerByExternalId } from "@/lib/polar";
import { getAllAgents } from "@/features/standalone-agents/lib/agent-registry";

const isProductKey = (value: unknown): value is ProductKey => {
  return PRODUCT_KEYS.includes(value as ProductKey);
};

const isTierKey = (value: unknown): value is TierKey => {
  return TIER_KEYS.includes(value as TierKey);
};

const isCognitiveProductKey = (value?: string) => {
  return typeof value === "string" && value.startsWith("cognitive-");
};

const DEFAULT_COGNITIVE_AGENT_PRICE = Number(
  process.env.POLAR_COGNITIVE_AGENT_MONTHLY_PRICE ?? "4900",
);

const DEFAULT_COGNITIVE_AGENT_CURRENCY =
  process.env.POLAR_COGNITIVE_AGENT_CURRENCY ?? "USD";

const findAgentMetadata = (agentId: string) => {
  return getAllAgents().find((agent) => agent.id === agentId);
};

const ensureCognitiveAgentProduct = async (params: {
  productKey: string;
  tierKey: string;
}) => {
  const { productKey, tierKey } = params;
  const polar = getPolarClient();
  const agentId = productKey.replace(/^cognitive-/, "");
  const agent = findAgentMetadata(agentId);
  const organizationId = await getOrganizationId();
  let existingProduct: any = null;
  const priceCurrency = DEFAULT_COGNITIVE_AGENT_CURRENCY.toLowerCase() || "usd";

  try {
    const productsPage = await (polar as any).products.list({
      organizationId: organizationId ?? undefined,
      limit: 100,
    });
    existingProduct = productsPage?.result?.items?.find((item: any) => {
      return item?.metadata?.productKey === productKey;
    });
  } catch (error) {
    const detail = (error as { detail?: Array<{ type?: string }> }).detail;
    const isOrgTokenError = Array.isArray(detail)
      && detail.some((entry) => entry?.type === "organization_token");
    if (isOrgTokenError) {
      try {
        const productsPage = await (polar as any).products.list({ limit: 100 });
        existingProduct = productsPage?.result?.items?.find((item: any) => {
          return item?.metadata?.productKey === productKey;
        });
      } catch (retryError) {
        console.warn("[Polar Checkout] Unable to list products after retry.", retryError);
      }
    } else {
      console.warn("[Polar Checkout] Unable to list products, will create new.", error);
    }
  }

  if (existingProduct) {
    return existingProduct.id as string;
  }

  const baseProductPayload = {
    name: agent?.name ?? `Cognitive Agent: ${agentId}`,
    description:
      agent?.description ??
      `Subscription for the ${agentId.replace(/-/g, " ")} cognitive agent.`,
    recurringInterval: "month" as const,
    prices: [
      {
        amountType: "fixed" as const,
        priceAmount: DEFAULT_COGNITIVE_AGENT_PRICE,
        priceCurrency,
      },
    ],
    metadata: {
      productKey,
      tierKey,
      agentId,
      type: "cognitive-agent",
    },
  };

  let createdProduct: any;
  try {
    createdProduct = await polar.products.create({
      ...baseProductPayload,
      organizationId: organizationId ?? undefined,
    });
  } catch (error) {
    const detail = (error as { detail?: Array<{ type?: string }> }).detail;
    const isOrgTokenError = Array.isArray(detail)
      && detail.some((entry) => entry?.type === "organization_token");
    if (!isOrgTokenError) {
      throw error;
    }
    createdProduct = await polar.products.create(baseProductPayload);
  }

  return createdProduct.id as string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      productKey?: string;
      tierKey?: string;
      externalCustomerId?: string;
      customerEmail?: string;
      customerName?: string;
      successUrl?: string;
    };

    if (!payload.productKey) {
      return NextResponse.json(
        { error: "Product key required." },
        { status: 400 },
      );
    }

    const isCognitiveProduct = isCognitiveProductKey(payload.productKey);
    const resolvedTierKey = payload.tierKey ?? "basic";

    if (!isCognitiveProduct && (!isProductKey(payload.productKey) || !isTierKey(resolvedTierKey))) {
      return NextResponse.json(
        { error: "Invalid product or tier." },
        { status: 400 },
      );
    }

    if (isCognitiveProduct && resolvedTierKey !== "basic") {
      return NextResponse.json(
        { error: "Invalid tier for cognitive agents." },
        { status: 400 },
      );
    }

    if (!payload.externalCustomerId || !payload.customerEmail) {
      return NextResponse.json(
        { error: "Customer information required." },
        { status: 400 },
      );
    }

    let productIds: string[] = [];
    let selectedTierProductId: string | undefined;

    if (isCognitiveProduct) {
      selectedTierProductId = await ensureCognitiveAgentProduct({
        productKey: payload.productKey,
        tierKey: resolvedTierKey,
      });

      productIds = [selectedTierProductId];
    } else {
      // Find the product and tier
      const catalog = PRODUCT_CATALOG;
      const product = catalog.find((entry) => entry.key === payload.productKey);
      const selectedTier = product?.tiers.find(
        (entry) => entry.key === resolvedTierKey,
      );

      if (!product || !selectedTier?.polarProductId) {
        return NextResponse.json(
          { error: "Missing Polar product ID for this tier." },
          { status: 400 },
        );
      }

      // Only include Basic and Pro tiers (exclude Enterprise)
      const tierProducts = product.tiers.filter(
        (tier) => tier.polarProductId && (tier.key === 'basic' || tier.key === 'pro')
      );
      
      if (tierProducts.length === 0) {
        return NextResponse.json(
          { error: "No valid tiers configured." },
          { status: 400 },
        );
      }

      // Put selected tier first, then other available tiers
      productIds = [
        selectedTier.polarProductId,
        ...tierProducts
          .map((tier) => tier.polarProductId)
          .filter((id) => id !== selectedTier.polarProductId),
      ].filter((id): id is string => id !== undefined);
    }

    // Create or get Polar customer with entityId as externalId
    // This locks the subscription to the entity
    const customer = await ensureCustomerByExternalId(
      payload.externalCustomerId,
      {
        email: payload.customerEmail,
        name: payload.customerName || payload.customerEmail.split("@")[0],
      }
    );

    console.log("[Polar Checkout] Created/found customer:", customer.id, "for entity:", payload.externalCustomerId);

    const polar = getPolarClient();
    
    // Determine base URL from request headers (for Cloud Run/Docker) or fallback to env/origin
    const url = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    
    let baseUrl: string;
    if (forwardedHost && forwardedProto) {
      // Behind a proxy/load balancer (Cloud Run, etc.)
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      // Use environment variable as fallback
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      // Direct access (local development)
      baseUrl = url.origin;
    }
    
    const fallbackSuccessUrl = `${baseUrl}/checkout/success?checkout_id={CHECKOUT_ID}&product_key=${payload.productKey}&tier_key=${resolvedTierKey}&external_customer_id=${payload.externalCustomerId}`;
    const successUrl = payload.successUrl || fallbackSuccessUrl;
    console.log("[Polar Checkout] Environment:", process.env.NODE_ENV);
    console.log("[Polar Checkout] Headers - x-forwarded-host:", forwardedHost);
    console.log("[Polar Checkout] Headers - x-forwarded-proto:", forwardedProto);
    console.log("[Polar Checkout] Base URL:", baseUrl);
    console.log("[Polar Checkout] Success URL:", successUrl);
    
    // Create checkout session with LOCKED customer
    const checkout = await polar.checkouts.create({
      products: productIds,
      successUrl: successUrl,
      customerId: customer.id, // Lock to this customer - email cannot be changed
      metadata: {
        productKey: payload.productKey,
        tierKey: resolvedTierKey,
        externalCustomerId: payload.externalCustomerId,
      },
    });

    console.log("[Polar Checkout] Created checkout session:", checkout.id);
    console.log("[Polar Checkout] Checkout URL:", checkout.url);

    return NextResponse.json({ 
      url: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error("Polar checkout error:", error);
    const message = error instanceof Error ? error.message : "Unable to create checkout.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}