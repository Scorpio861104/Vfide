# Production Dockerfile for Next.js Frontend
# SECURITY NOTE (§21.1): Pin this image to a specific digest before production deployment
# to prevent supply-chain substitution via mutable image tags.
# Steps to pin:
#   docker pull node:25-alpine
#   docker inspect node:25-alpine --format='{{index .RepoDigests 0}}'
# Then replace `node:25-alpine` with `node:25-alpine@sha256:<digest>` on the FROM line below.
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package manifest + lockfile + npm config for deterministic installs.
# .npmrc carries `legacy-peer-deps=true` which is required because
# @layerzerolabs/lz-evm-oapp-v2 transitively requires ethers ^5 (via
# @eth-optimism/contracts), while the root project uses ethers ^6. Without
# this, `npm ci` fails with ERESOLVE in the Docker build context.
COPY package.json package-lock.json .npmrc ./
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
