# VFIDE WebSocket Server — Production Dockerfile
# Security hardening mirrors the main app container policy: pinned image digest + non-root runtime.
FROM node:25-alpine@sha256:cf38e1f3c28ac9d81cdc0c51d8220320b3b618780e44ef96a39f76f7dbfef023 AS base

FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm install --ignore-scripts && npm run build

FROM base AS runner
WORKDIR /app

# Run as non-root user
RUN addgroup --system --gid 1001 wsserver && \
    adduser --system --uid 1001 wsserver
USER wsserver

COPY --from=deps --chown=wsserver:wsserver /app/node_modules ./node_modules
COPY --from=builder --chown=wsserver:wsserver /app/dist ./dist

# Default port; override with WS_PORT env var
EXPOSE 8080

# Disable npm update notifier and telemetry
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
