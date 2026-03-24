// scripts/dev-with-vault.mjs
import "dotenv/config";
import vault from "node-vault";
import { spawn } from "child_process";

// 🔐 Vault config from environment variables
const VAULT_ADDR = process.env.VAULT_ADDR ;
const VAULT_KV_MOUNT = process.env.VAULT_KV_MOUNT ;
const VAULT_SECRET_PATH = process.env.VAULT_SECRET_PATH ;

async function loadSecretsFromVault(client) {
  // KV v2 path
  const v2Path = `${VAULT_KV_MOUNT}/data/${VAULT_SECRET_PATH}`;
  try {
    console.log(`🔎 Trying KV v2 path: ${v2Path}`);
    const res = await client.read(v2Path);
    const secrets = res?.data?.data;
    if (!secrets) {
      throw new Error("KV v2 format missing data.data");
    }
    console.log("✅ Loaded secrets using KV v2");
    return secrets;
  } catch (err) {
    console.warn(`⚠️ KV v2 read failed: ${err.message}`);
    console.warn("   Falling back to KV v1…");

    // KV v1 path
    const v1Path = `${VAULT_KV_MOUNT}/${VAULT_SECRET_PATH}`;
    console.log(`🔎 Trying KV v1 path: ${v1Path}`);
    const res = await client.read(v1Path);
    const secrets = res?.data;
    if (!secrets) {
      throw new Error("KV v1 format missing data");
    }
    console.log("✅ Loaded secrets using KV v1");
    return secrets;
  }
}

async function main() {
  const VAULT_TOKEN = process.env.VAULT_TOKEN;

  if (!VAULT_TOKEN) {
    console.error("❌ VAULT_TOKEN must be set in .env");
    process.exit(1);
  }

  const client = vault({
    endpoint: VAULT_ADDR,
    token: VAULT_TOKEN,
  });

  let secrets;
  try {
    secrets = await loadSecretsFromVault(client);
  } catch (err) {
    console.error("❌ Vault read failed:", err);
    process.exit(1);
  }

  // Inject secrets into process.env
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = String(value);
  }

  console.log("🔐 Vault secrets loaded. Starting Next.js...");

  // On Windows, run through the shell so "npm run dev" works
  const child = spawn("npm run dev", {
    shell: true,
    env: process.env,
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error("❌ Failed to start Next.js:", err);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
