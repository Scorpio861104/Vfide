# VFIDE WebSocket Server — Production Dockerfile
# Security hardening mirrors the main app container policy: pinned image digest + non-root runtime.
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS base

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

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "const p=process.env.WS_PORT||8080;require('http').get('http://localhost:'+p+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
