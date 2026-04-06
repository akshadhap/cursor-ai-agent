import fs from "fs";
import path from "path";
import { Polar } from "@polar-sh/sdk";

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const index = trimmed.indexOf("=");
    if (index <= 0) {
      return;
    }
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^"(.*)"$/, "$1");
    }
  });
};

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const CATALOG = [
  {
    key: "workflows",
    label: "Workflows",
    usageEventName: "usage.workflows",
    tiers: [
      { key: "basic", label: "Basic", tokens: 150000, seats: 5, priceAmountCents: 3900 },
      { key: "pro", label: "Pro", tokens: 800000, seats: 20, priceAmountCents: 14900 },
    ],
  },
  {
    key: "chatbot-builder",
    label: "Chatbot Builder",
    usageEventName: "usage.chatbot_builder",
    tiers: [
      { key: "basic", label: "Basic", tokens: 250000, seats: 5, priceAmountCents: 4900 },
      { key: "pro", label: "Pro", tokens: 1200000, seats: 25, priceAmountCents: 19900 },
    ],
  },
  {
    key: "voice-agent-builder",
    label: "Voice Agent Builder",
    usageEventName: "usage.voice_agent_builder",
    tiers: [
      { key: "basic", label: "Basic", tokens: 200000, seats: 3, priceAmountCents: 5900 },
      { key: "pro", label: "Pro", tokens: 900000, seats: 15, priceAmountCents: 24900 },
    ],
  },
  {
    key: "slm",
    label: "SLM",
    usageEventName: "usage.slm",
    tiers: [
      { key: "basic", label: "Basic", tokens: 500000, seats: 2, priceAmountCents: 9900 },
      { key: "pro", label: "Pro", tokens: 2500000, seats: 12, priceAmountCents: 34900 },
    ],
  },
];

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const productNameVariants = (productLabel, tierLabel) => [
  `${productLabel} ${tierLabel}`,
  `${productLabel} - ${tierLabel}`,
  `${productLabel} (${tierLabel})`,
  `${productLabel} ${tierLabel} Plan`,
];

const meterNameVariants = (productLabel, usageEventName) => [
  `${productLabel} Usage`,
  `${productLabel} Tokens`,
  usageEventName,
];

const metadataMatches = (metadata, key, expected) => {
  if (!metadata || !(key in metadata)) {
    return false;
  }
  return String(metadata[key]) === expected;
};

const isOrganizationTokenError = (error) => {
  const detail = error?.detail;
  if (!Array.isArray(detail)) {
    return false;
  }
  return detail.some((entry) => entry?.type === "organization_token");
};

const collectItems = async (iteratorPromise) => {
  const iterator = await iteratorPromise;
  const items = [];
  for await (const page of iterator) {
    items.push(...page.result.items);
  }
  return items;
};

const createWithOrganizationFallback = async (
  organizationId,
  createFn,
  payload,
) => {
  if (!organizationId) {
    return createFn(payload);
  }

  try {
    return await createFn({ ...payload, organizationId });
  } catch (error) {
    if (isOrganizationTokenError(error)) {
      return createFn(payload);
    }
    throw error;
  }
};

const ensureMeter = async (polar, meters, organizationId, product) => {
  const directMatch = meters.find((meter) =>
    metadataMatches(meter.metadata, "productKey", product.key),
  );
  if (directMatch) {
    return directMatch;
  }

  const variants = meterNameVariants(product.label, product.usageEventName).map(normalize);
  const nameMatch = meters.find((meter) => variants.includes(normalize(meter.name)));
  if (nameMatch) {
    return nameMatch;
  }

  const created = await createWithOrganizationFallback(
    organizationId,
    (payload) => polar.meters.create(payload),
    {
      name: `${product.label} Usage`,
      metadata: { productKey: product.key },
      filter: {
        conjunction: "and",
        clauses: [
          {
            property: "name",
            operator: "eq",
            value: product.usageEventName,
          },
        ],
      },
      aggregation: {
        func: "sum",
        property: "total_tokens",
      },
    },
  );
  meters.push(created);
  return created;
};

const ensureBenefit = async (polar, benefits, organizationId, product, tier, meterId) => {
  const directMatch = benefits.find(
    (benefit) =>
      metadataMatches(benefit.metadata, "productKey", product.key) &&
      metadataMatches(benefit.metadata, "tierKey", tier.key),
  );
  if (directMatch) {
    return directMatch;
  }

  const description = `${product.label} ${tier.label} credits`;
  const descriptionMatch = benefits.find(
    (benefit) => benefit.description?.toLowerCase() === description.toLowerCase(),
  );
  if (descriptionMatch) {
    return descriptionMatch;
  }

  const created = await createWithOrganizationFallback(
    organizationId,
    (payload) => polar.benefits.create(payload),
    {
      type: "meter_credit",
      description,
      metadata: {
        productKey: product.key,
        tierKey: tier.key,
        usageEventName: product.usageEventName,
      },
      properties: {
        units: tier.tokens,
        rollover: false,
        meterId,
      },
    },
  );
  benefits.push(created);
  return created;
};

const ensureProduct = async (polar, products, organizationId, product, tier) => {
  const directMatch = products.find(
    (entry) =>
      metadataMatches(entry.metadata, "productKey", product.key) &&
      metadataMatches(entry.metadata, "tierKey", tier.key),
  );
  if (directMatch) {
    return directMatch;
  }

  const variants = productNameVariants(product.label, tier.label).map(normalize);
  const nameMatch = products.find((entry) => variants.includes(normalize(entry.name)));
  if (nameMatch) {
    return nameMatch;
  }

  const created = await createWithOrganizationFallback(
    organizationId,
    (payload) => polar.products.create(payload),
    {
      name: `${product.label} ${tier.label}`,
      description: `${product.label} ${tier.label} subscription`,
      metadata: {
        productKey: product.key,
        tierKey: tier.key,
      },
      recurringInterval: "month",
      prices: [
        {
          amountType: "fixed",
          priceCurrency: "usd",
          priceAmount: tier.priceAmountCents,
        },
      ],
    },
  );
  products.push(created);
  return created;
};

const ensureProductBenefit = async (polar, product, benefitId) => {
  const existingBenefitIds = product.benefits.map((benefit) => benefit.id);
  if (existingBenefitIds.includes(benefitId)) {
    return;
  }
  await polar.products.updateBenefits({
    id: product.id,
    productBenefitsUpdate: {
      benefits: [...existingBenefitIds, benefitId],
    },
  });
};

const ensureCheckoutLink = async (
  polar,
  checkoutLinks,
  product,
  tierProductIds,
  successUrl,
) => {
  const label = `${product.label} tiers`;
  const existing = checkoutLinks.find((link) => link.label === label);
  if (existing) {
    return existing;
  }

  const created = await polar.checkoutLinks.create({
    paymentProcessor: "stripe",
    label,
    successUrl,
    products: tierProductIds,
    metadata: {
      productKey: product.key,
    },
  });
  checkoutLinks.push(created);
  return created;
};

const run = async () => {
  const server = (process.env.POLAR_SERVER || 'production').toLowerCase();
  const accessToken = server === 'sandbox' 
    ? process.env.POLAR_ACCESS_TOKEN_DEV
    : (process.env.POLAR_ACCESS_TOKEN_PRODUCTION || process.env.POLAR_ACCESS_TOKEN);
  if (!accessToken) {
    throw new Error(`Missing POLAR_ACCESS_TOKEN for ${server}. Set POLAR_ACCESS_TOKEN_${server.toUpperCase()}`);
  }

  const successUrlBase =
    process.env.POLAR_SUCCESS_URL ?? "http://localhost:3000";

  const polar = new Polar({ accessToken, server });
  let organizationId = process.env.POLAR_ORGANIZATION_ID ?? null;
  if (!organizationId) {
    try {
      organizationId =
        (await polar.organizations.list({ limit: 1 })).result.items[0]?.id ?? null;
    } catch (error) {
      void error;
    }
  }

  if (!organizationId) {
    console.warn(
      "Organization ID not resolved. Assuming organization token; set POLAR_ORGANIZATION_ID if needed.",
    );
  }

  const productListArgs = organizationId
    ? { organizationId, isArchived: false, limit: 100 }
    : { isArchived: false, limit: 100 };
  const meterListArgs = organizationId
    ? { organizationId, isArchived: false, limit: 100 }
    : { isArchived: false, limit: 100 };
  const benefitListArgs = organizationId
    ? { organizationId, typeFilter: "meter_credit", limit: 100 }
    : { typeFilter: "meter_credit", limit: 100 };
  const checkoutListArgs = organizationId
    ? { organizationId, limit: 100 }
    : { limit: 100 };

  const [products, meters, benefits, checkoutLinks] = await Promise.all([
    collectItems(polar.products.list(productListArgs)),
    collectItems(polar.meters.list(meterListArgs)),
    collectItems(polar.benefits.list(benefitListArgs)),
    collectItems(polar.checkoutLinks.list(checkoutListArgs)),
  ]);

  const successUrl = `${successUrlBase}/checkout/success?checkout_id={CHECKOUT_ID}`;

  for (const product of CATALOG) {
    const meter = await ensureMeter(polar, meters, organizationId, product);
    const tierProducts = [];
    console.log(`\n${product.label}`);
    console.log(`  meter: ${meter.id}`);

    for (const tier of product.tiers) {
      const benefit = await ensureBenefit(
        polar,
        benefits,
        organizationId,
        product,
        tier,
        meter.id,
      );
      const productEntry = await ensureProduct(
        polar,
        products,
        organizationId,
        product,
        tier,
      );
      await ensureProductBenefit(polar, productEntry, benefit.id);
      tierProducts.push(productEntry.id);
      console.log(
        `  ${tier.label}: product ${productEntry.id} benefit ${benefit.id}`,
      );
    }

    if (tierProducts.length === product.tiers.length) {
      const checkoutLink = await ensureCheckoutLink(
        polar,
        checkoutLinks,
        product,
        tierProducts,
        successUrl,
      );
      console.log(`  checkout link: ${checkoutLink.url}`);
    }
  }

  console.log("Polar catalog bootstrap complete.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
