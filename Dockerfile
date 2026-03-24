#############################################
# 0. Base (shared OS deps)
#############################################
FROM node:20-slim AS base
WORKDIR /app

# OS deps required for Prisma (OpenSSL 3, libc6, CA certs)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libc6 ca-certificates \
  && rm -rf /var/lib/apt/lists/*


#############################################
# 1. Dependencies
#############################################
FROM base AS deps

# Copy manifests together
COPY package.json package-lock.json* ./

# Prefer npm ci when lockfile exists
RUN npm install --include=dev


#############################################
# 2. Build
#############################################
FROM base AS build

# Copy deps + source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time envs (passed as build args)
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG ENCRYPTION_KEY
ARG VAULT_ADDR
ARG VAULT_TOKEN
ARG VAULT_KV_MOUNT
ARG VAULT_SECRET_PATH
ARG NEXT_PUBLIC_CONVEX_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG POLAR_ACCESS_TOKEN

ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV VAULT_ADDR=${VAULT_ADDR}
ENV VAULT_TOKEN=${VAULT_TOKEN}
ENV VAULT_KV_MOUNT=${VAULT_KV_MOUNT}
ENV VAULT_SECRET_PATH=${VAULT_SECRET_PATH}
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV POLAR_ACCESS_TOKEN=${POLAR_ACCESS_TOKEN}

# Skip Prisma engine download during generate
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Build Next.js (Prisma client already included in COPY)
RUN npm run build


#############################################
# 3. Runner (Production)
#############################################
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV AUTH_ENV=production

# Copy runtime artifacts (kept together)
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated/prisma ./src/generated/prisma
COPY --from=build /app/scripts ./scripts

EXPOSE 8080
CMD ["node", "scripts/start-with-vault.mjs"]
