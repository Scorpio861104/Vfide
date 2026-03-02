# VFIDE WebSocket Server — Production Dockerfile
# SECURITY NOTE: Pin this image to a specific digest before production deployment.
# Steps to pin:
#   docker pull node:20-alpine
#   docker inspect node:20-alpine --format='{{index .RepoDigests 0}}'
# Then replace `node:20-alpine` with `node:20-alpine@sha256:<digest>` on the FROM lines below.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm install --ignore-scripts && npm run build

FROM node:20-alpine AS runner
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
