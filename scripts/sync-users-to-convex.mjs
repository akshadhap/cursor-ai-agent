#!/usr/bin/env node

/**
 * Sync existing Better Auth users to self-hosted Convex
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import { ConvexHttpClient } from 'convex/browser';
import { randomUUID } from 'crypto';
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

// Load .env
const envPath = join(rootDir, '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      // Don't override if already set from .env.local
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (err) {
  console.error('Warning: Could not load .env:', err.message);
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error('❌ Error: NEXT_PUBLIC_CONVEX_URL must be set in .env.local');
  process.exit(1);
}

console.log('🔄 Syncing Better Auth users to Convex...');
console.log(`📍 Convex URL: ${CONVEX_URL}`);
console.log('');

const prisma = new PrismaClient();
const convex = new ConvexHttpClient(CONVEX_URL);

async function syncUsers() {
  try {
    // Get all users from Better Auth (Postgres)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    console.log(`📊 Found ${users.length} users in Better Auth`);
    console.log('');

    // We need to import the API - but since we're in a script, let's use direct mutation
    for (const user of users) {
      console.log(`👤 Syncing user: ${user.email}`);
      
      try {
        // Check if user already exists in Convex by querying
        const existingUsers = await convex.query('users:getMany', {});
        const existingUser = existingUsers?.find((u) => u.email === user.email);

        if (existingUser) {
          console.log(`   ⏭️  User already exists in Convex, skipping...`);
          continue;
        }

        // Add user to Convex
        await convex.mutation('users:add', {
          name: user.name || user.email,
          email: user.email,
          authId: user.id,
          entityId: randomUUID().replace(/-/g, '').slice(0, 5),
        });

        console.log(`   ✅ Synced successfully`);
      } catch (error) {
        console.error(`   ❌ Failed to sync: ${error.message}`);
      }
      console.log('');
    }

    console.log('✅ User sync complete!');
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    convex.close();
  }
}

syncUsers();
