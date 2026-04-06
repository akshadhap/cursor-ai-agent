import fetch from "node-fetch";

const ENVIRONMENTS = {
  sandbox: {
    token: process.env.POLAR_ACCESS_TOKEN_DEV || process.env.POLAR_ACCESS_TOKEN,
    apiBase: "https://sandbox-api.polar.sh/v1"
  },
  production: {
    token: process.env.POLAR_ACCESS_TOKEN_PRODUCTION || process.env.POLAR_ACCESS_TOKEN,
    apiBase: "https://api.polar.sh/v1"
  }
};

async function fetchAllMeters(apiBase, token) {
  let page = 1;
  const meters = [];

  while (true) {
    const res = await fetch(`${apiBase}/meters?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    
    if (json.items && json.items.length > 0) {
      meters.push(...json.items);
    }

    if (!json.pagination || !json.items || json.items.length === 0) break;
    page++;
  }
  return meters;
}

async function fetchAllProducts(apiBase, token) {
  let page = 1;
  const products = [];

  while (true) {
    const res = await fetch(`${apiBase}/products?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    
    if (json.items && json.items.length > 0) {
      products.push(...json.items);
    }

    if (!json.pagination || !json.items || json.items.length === 0) break;
    page++;
  }
  return products;
}

async function fetchEnvironmentData(envName, config) {
  if (!config.token) {
    console.log(`\n⚠️  Skipping ${envName} - no token set`);
    return null;
  }

  console.log(`\n📡 Fetching from ${envName}...`);
  console.log(`   API: ${config.apiBase}`);

  try {
    const [meters, products] = await Promise.all([
      fetchAllMeters(config.apiBase, config.token),
      fetchAllProducts(config.apiBase, config.token)
    ]);

    console.log(`   ✓ Found ${meters.length} meters`);
    console.log(`   ✓ Found ${products.length} products`);

    return { meters, products };
  } catch (error) {
    console.error(`   ✗ Error fetching from ${envName}:`, error.message);
    return null;
  }
}

function formatCatalogEntry(envName, data) {
  if (!data) return null;

  const { meters, products } = data;
  
  // Map product keys to their data
  const catalog = {
    workflows: { meterId: null, tiers: {} },
    "chatbot-builder": { meterId: null, tiers: {} },
    "voice-agent-builder": { meterId: null, tiers: {} },
    slm: { meterId: null, tiers: {} }
  };

  // Find meters
  meters.forEach(meter => {
    const key = meter.metadata?.productKey;
    if (key && catalog[key]) {
      catalog[key].meterId = meter.id;
    }
  });

  // Find products
  products.forEach(product => {
    const productKey = product.metadata?.productKey;
    const tierKey = product.metadata?.tierKey;
    
    if (productKey && tierKey && catalog[productKey]) {
      catalog[productKey].tiers[tierKey] = product.id;
    }
  });

  return catalog;
}

(async () => {
  console.log("🔍 Fetching Polar IDs from all environments...\n");

  const results = {};
  
  for (const [envName, config] of Object.entries(ENVIRONMENTS)) {
    const data = await fetchEnvironmentData(envName, config);
    if (data) {
      results[envName] = formatCatalogEntry(envName, data);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📋 CATALOG CONFIGURATION");
  console.log("=".repeat(80));

  for (const [envName, catalog] of Object.entries(results)) {
    console.log(`\n### ${envName.toUpperCase()} ###\n`);
    
    for (const [productKey, productData] of Object.entries(catalog)) {
      console.log(`${productKey}:`);
      console.log(`  meterId: "${productData.meterId}"`);
      console.log(`  tiers:`);
      for (const [tierKey, productId] of Object.entries(productData.tiers)) {
        console.log(`    ${tierKey}: "${productId}"`);
      }
      console.log();
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("💡 Usage Instructions:");
  console.log("=".repeat(80));
  console.log("\n1. Set environment tokens:");
  console.log("   $env:POLAR_ACCESS_TOKEN_DEV=\"your_sandbox_token\"");
  console.log("   $env:POLAR_ACCESS_TOKEN_PRODUCTION=\"your_production_token\"");
  console.log("\n2. Run this script:");
  console.log("   node scripts/fetch-polar-ids.mjs");
  console.log("\n3. Copy the IDs above into your catalog.ts file");
  console.log("\n" + "=".repeat(80));
})();
