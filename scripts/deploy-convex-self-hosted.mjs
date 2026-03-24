#!/usr/bin/env node

/**
 * Deploy Convex functions to self-hosted instance
 * Usage: node scripts/deploy-convex-self-hosted.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
const envLocalPath = join(rootDir, '.env.local');
try {
  const envContent = readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} catch (err) {
  console.error('Warning: Could not load .env.local:', err.message);
}

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;

if (!CONVEX_URL) {
  console.error('❌ Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL must be set in .env.local');
  process.exit(1);
}

if (!CONVEX_DEPLOY_KEY) {
  console.error('❌ Error: CONVEX_DEPLOY_KEY must be set in .env.local');
  process.exit(1);
}

console.log('🚀 Deploying Convex functions to self-hosted instance...');
console.log(`📍 Target: ${CONVEX_URL}`);
console.log('');

// For on-prem Convex, use 'convex dev --once' which will watch and push changes
const command = `npx convex dev --url "${CONVEX_URL}" --admin-key "${CONVEX_DEPLOY_KEY}" --once --typecheck=disable`;

const convexProcess = spawn(command, [], {
  stdio: 'inherit',
  cwd: rootDir,
  shell: true,
});

convexProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Deployment successful!');
  } else {
    console.error(`\n❌ Deployment failed with exit code ${code}`);
    process.exit(code);
  }
});

convexProcess.on('error', (err) => {
  console.error('❌ Failed to start deployment:', err);
  process.exit(1);
});
