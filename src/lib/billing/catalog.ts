export const PRODUCT_KEYS = [
  "workflows",
  "chatbot-builder",
  "voice-agent-builder",
  "slm",
] as const;

export const TIER_KEYS = ["basic", "pro", "enterprise"] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];
export type TierKey = (typeof TIER_KEYS)[number];

export type TierDefinition = {
  key: TierKey;
  label: string;
  tokens: number;
  seats: number;
  priceLabel: string;
  polarProductId?: string;
  accent?: string;
};

export type ProductDefinition = {
  key: ProductKey;
  label: string;
  tagline: string;
  description: string;
  highlights: string[];
  usageEventName: string;
  meterId?: string;
  tiers: TierDefinition[];
};

// Environment-specific IDs (hardcoded from Polar API)
// Production IDs are below, run scripts/fetch-polar-ids.mjs to get sandbox IDs
const POLAR_IDS = {
  sandbox: {
    workflows: {
      meterId: "ce59f354-2865-4a7d-8172-c802dde4947e",
      basic: "115e2585-bb3c-45c4-a4d6-ed95a4630684",
      pro: "c367151e-9fbb-4f03-904b-842abc292c2a",
      enterprise: "382feafe-4579-4a38-bff7-e8cff7181b52",
    },
    "chatbot-builder": {
      meterId: "f174ba05-b92d-42c2-8c94-e6be7d9c42be",
      basic: "19e0bb86-01de-457d-b1fe-77ec030df5db",
      pro: "545ea804-5624-46b3-8103-849c7dc7fcdd",
      enterprise: "0d8182e1-e012-4ad0-a7ee-74899abe293b",
    },
    "voice-agent-builder": {
      meterId: "e5c3705b-76e9-40ae-8487-25a996d47327",
      basic: "8c19bbcc-d7dc-4a1f-a8ea-8762fbc6f3a0",
      pro: "c333c6b2-ca75-42d6-b21a-f2bb3e6ceed6",
      enterprise: "1355bc44-97f6-4467-97e0-f92392fe421c",
    },
    slm: {
      meterId: "942f56a5-17f9-4050-abc1-95931449be14",
      basic: "a98db561-5c67-4cc9-bd3a-20274c9c5cee",
      pro: "c7dc4711-7d28-4ab3-bf72-5660f97ee9bb",
      enterprise: "b3f3f97c-4f6e-4953-81d2-00aa6e0823e5",
    },
  },
  production: {
    workflows: {
      meterId: "e5679eab-9bcd-4724-a8aa-35aa73008adb",
      basic: "cf7f0aed-8654-4c1e-a411-63aa03cc78d1",
      pro: "497a3c64-ca4e-4ad1-b34e-dd60eba1a7f7",
      enterprise: "382feafe-4579-4a38-bff7-e8cff7181b52",
    },
    "chatbot-builder": {
      meterId: "22c9cc6a-529a-4740-802f-20a0db64675a",
      basic: "28785b69-bc19-43da-92c5-78f09a23023a",
      pro: "d107c2c5-3465-4480-a1c5-f512db783444",
      enterprise: "0d8182e1-e012-4ad0-a7ee-74899abe293b",
    },
    "voice-agent-builder": {
      meterId: "f3d3122b-bb82-4358-b2a3-c03660cc3a6e",
      basic: "c1bacbfb-b005-40cf-b612-5872bbbbba53",
      pro: "ce2218e1-1887-4ebb-9404-1dd97b178b83",
      enterprise: "1355bc44-97f6-4467-97e0-f92392fe421c",
    },
    slm: {
      meterId: "48e4c4fc-5b26-4a06-8e22-df89441b9052",
      basic: "17afe645-ea3c-485f-9a87-fe1a5eae7557",
      pro: "b9e18a05-c0d0-4e56-89bf-59ecde7d088b",
      enterprise: "b3f3f97c-4f6e-4953-81d2-00aa6e0823e5",
    },
  },
};

const getEnvironment = (): "sandbox" | "production" => {
  const server = process.env.POLAR_SERVER?.toLowerCase();
  return server === "sandbox" ? "sandbox" : "production";
};

const getIds = (productKey: ProductKey) => {
  const env = getEnvironment();
  return POLAR_IDS[env][productKey];
};

export const PRODUCT_CATALOG: ProductDefinition[] = [
  {
    key: "workflows",
    label: "Workflows",
    tagline: "Automate multi-step operations with guardrails.",
    description:
      "Orchestrate retries, approvals, and routing for every execution.",
    highlights: ["Versioned pipelines", "Retry playbooks", "Audit timelines"],
    usageEventName: "usage.workflows",
    get meterId() {
      return getIds("workflows").meterId;
    },
    tiers: [
      {
        key: "basic",
        label: "Basic",
        tokens: 150_000,
        seats: 5,
        priceLabel: "$39/mo",
        get polarProductId() {
          return getIds("workflows").basic;
        },
      },
      {
        key: "pro",
        label: "Pro",
        tokens: 800_000,
        seats: 20,
        priceLabel: "$149/mo",
        accent: "Most popular",
        get polarProductId() {
          return getIds("workflows").pro;
        },
      },
      {
        key: "enterprise",
        label: "Enterprise",
        tokens: 5_000_000,
        seats: 100,
        priceLabel: "Talk to sales",
        accent: "Custom",
        get polarProductId() {
          return getIds("workflows").enterprise;
        },
      },
    ],
  },
  {
    key: "chatbot-builder",
    label: "Chatbot Builder",
    tagline: "Launch channel-ready bots in hours.",
    description:
      "Design flows, ground responses, and deploy to every touchpoint.",
    highlights: ["Multichannel launch", "Knowledge sources", "Fallback rules"],
    usageEventName: "usage.chatbot_builder",
    get meterId() {
      return getIds("chatbot-builder").meterId;
    },
    tiers: [
      {
        key: "basic",
        label: "Basic",
        tokens: 250_000,
        seats: 5,
        priceLabel: "$49/mo",
        get polarProductId() {
          return getIds("chatbot-builder").basic;
        },
      },
      {
        key: "pro",
        label: "Pro",
        tokens: 1_200_000,
        seats: 25,
        priceLabel: "$199/mo",
        accent: "Revenue ready",
        get polarProductId() {
          return getIds("chatbot-builder").pro;
        },
      },
      {
        key: "enterprise",
        label: "Enterprise",
        tokens: 8_000_000,
        seats: 150,
        priceLabel: "Talk to sales",
        accent: "Custom",
        get polarProductId() {
          return getIds("chatbot-builder").enterprise;
        },
      },
    ],
  },
  {
    key: "voice-agent-builder",
    label: "Voice Agent Builder",
    tagline: "Low-latency voice agents with compliance.",
    description:
      "Build telephony-ready agents with monitoring and safety layers.",
    highlights: ["Telephony routing", "Latency tuning", "Safety playbooks"],
    usageEventName: "usage.voice_agent_builder",
    get meterId() {
      return getIds("voice-agent-builder").meterId;
    },
    tiers: [
      {
        key: "basic",
        label: "Basic",
        tokens: 200_000,
        seats: 3,
        priceLabel: "$59/mo",
        get polarProductId() {
          return getIds("voice-agent-builder").basic;
        },
      },
      {
        key: "pro",
        label: "Pro",
        tokens: 900_000,
        seats: 15,
        priceLabel: "$249/mo",
        accent: "Most tuned",
        get polarProductId() {
          return getIds("voice-agent-builder").pro;
        },
      },
      {
        key: "enterprise",
        label: "Enterprise",
        tokens: 6_000_000,
        seats: 75,
        priceLabel: "Talk to sales",
        accent: "Custom",
        get polarProductId() {
          return getIds("voice-agent-builder").enterprise;
        },
      },
    ],
  },
  {
    key: "slm",
    label: "SLM",
    tagline: "Private small language models at scale.",
    description:
      "Deploy high-throughput models with isolation and audit trails.",
    highlights: ["Dedicated pods", "Secure vectors", "Custom fine-tunes"],
    usageEventName: "usage.slm",
    get meterId() {
      return getIds("slm").meterId;
    },
    tiers: [
      {
        key: "basic",
        label: "Basic",
        tokens: 500_000,
        seats: 2,
        priceLabel: "$99/mo",
        get polarProductId() {
          return getIds("slm").basic;
        },
      },
      {
        key: "pro",
        label: "Pro",
        tokens: 2_500_000,
        seats: 12,
        priceLabel: "$349/mo",
        accent: "Scale ready",
        get polarProductId() {
          return getIds("slm").pro;
        },
      },
      {
        key: "enterprise",
        label: "Enterprise",
        tokens: 15_000_000,
        seats: 50,
        priceLabel: "Talk to sales",
        accent: "Custom",
        get polarProductId() {
          return getIds("slm").enterprise;
        },
      },
    ],
  },
];

export const PRODUCT_LOOKUP = PRODUCT_CATALOG.reduce(
  (acc, product) => {
    acc[product.key] = product;
    return acc;
  },
  {} as Record<ProductKey, ProductDefinition>,
);

export const getTierDefinition = (productKey: ProductKey, tierKey: TierKey) => {
  const product = PRODUCT_LOOKUP[productKey];
  return product.tiers.find((tier) => tier.key === tierKey);
};
