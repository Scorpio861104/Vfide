# VFIDE WebSocket Server

Secure, authenticated WebSocket server for VFIDE real-time updates.

## Security Controls (§26 audit checklist)

| Control | Implementation |
|---------|---------------|
| JWT authentication | Bearer token in `Authorization` header only; verified against `JWT_SECRET` with `PREV_JWT_SECRET` rotation support |
| Per-IP rate limiting | 10 new connections / min; 60 messages / min per IP |
| Payload size limit | `maxPayload: 8 KiB` enforced at server level + belt-and-suspenders check |
| Schema validation | Zod `discriminatedUnion` validates every inbound message; unknown types rejected |
| Malformed frames | JSON parse errors caught and returned as `{ type: "error" }` — never crash |
| CORS / Origin | Upgrade requests validated against `ALLOWED_ORIGINS` allowlist |
| TLS | Plain HTTP by default; TLS terminated upstream. Set `WS_TLS_CERT` + `WS_TLS_KEY` for direct TLS. |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | HMAC-SHA256 secret matching the HTTP API (`lib/auth/jwt.ts`) |
| `PREV_JWT_SECRET` | No | Previous secret during rotation window |
| `ALLOWED_ORIGINS` | **Yes in prod** | Comma-separated origin allowlist, e.g. `https://vfide.io` |
| `WS_PORT` | No | Listening port (default: `8080`) |
| `WS_TLS_CERT` | No | Path to TLS certificate file |
| `WS_TLS_KEY` | No | Path to TLS private key file |
| `WS_TOPIC_ACL_PATH` | No | Path to topic ACL snapshot JSON (`version`, `updatedAt`, `grants`) |
| `WS_TOPIC_ACL_REFRESH_MS` | No | ACL snapshot refresh interval in milliseconds (default: `30000`) |

## TLS Configuration (Recommended: nginx proxy)

For production, terminate TLS in nginx and proxy to the plain-WS server:

```nginx
server {
    listen 443 ssl;
    server_name ws.vfide.io;

    ssl_certificate     /etc/ssl/vfide/cert.pem;
    ssl_certificate_key /etc/ssl/vfide/key.pem;

    location / {
        proxy_pass http://websocket:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }
}
```

## Running Locally

```bash
cd websocket-server
npm install
JWT_SECRET=dev-secret ALLOWED_ORIGINS=http://localhost:3000 npm run dev
```

## Docker (docker-compose)

Uncomment and configure the `websocket` service in `docker-compose.yml`:

```yaml
websocket:
  build:
    context: ./websocket-server
    dockerfile: Dockerfile
  container_name: vfide-websocket
  restart: unless-stopped
  ports:
    - "8080:8080"
  depends_on:
    - postgres
  environment:
    JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
    ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000}
    DATABASE_URL: postgresql://vfide_user:${POSTGRES_PASSWORD}@postgres:5432/vfide_db
```

## Message Protocol

### Client → Server

```json
{ "type": "auth", "payload": { "token": "<jwt>" } }
{ "type": "ping" }
{ "type": "subscribe",   "payload": { "topic": "vault.0xABC" } }
{ "type": "unsubscribe", "payload": { "topic": "vault.0xABC" } }
```

Notes:

- The first privileged client message must be `auth`; unauthenticated sockets are rejected with `AUTH_REQUIRED` and closed after timeout.
- When `WS_TOPIC_ACL_PATH` is configured, subscribe/unsubscribe authorization is evaluated against the periodically refreshed ACL snapshot.

### Server → Client

```json
{ "type": "connected",    "payload": { "sessionId": "...", "serverTime": 1700000000000 } }
{ "type": "pong",         "payload": { "ts": 1700000000000 } }
{ "type": "subscribed",   "payload": { "topic": "vault.0xABC" } }
{ "type": "unsubscribed", "payload": { "topic": "vault.0xABC" } }
{ "type": "error",        "payload": { "code": "RATE_LIMIT", "message": "..." } }
```
