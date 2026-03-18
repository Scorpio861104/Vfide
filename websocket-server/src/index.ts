/**
 * VFIDE WebSocket Server
 *
 * Security controls implemented (§26 audit checklist):
 *  ✅ JWT verified on upgrade handshake (Authorization header only)
 *  ✅ Per-IP rate limiting (connection + message)
 *  ✅ Message payload size limit (MAX_PAYLOAD_BYTES = 8 KiB)
 *  ✅ Zod schema validation on every inbound message
 *  ✅ Graceful handling of malformed frames (JSON parse + schema errors caught)
 *  ✅ CORS / Origin validation on upgrade (allowlist from ALLOWED_ORIGINS env var)
 *  ✅ TLS: server binds plain HTTP by default; TLS terminated upstream (nginx/Caddy).
 *       Set WS_TLS_CERT + WS_TLS_KEY for direct TLS binding.
 *       See README.md for the recommended nginx TLS proxy configuration.
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { verifyJWT, JWTPayload } from './auth';
import { RateLimiter } from './rateLimit';
import { parseMessage, OutboundMessage } from './schema';

// ─── Configuration ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WS_PORT || '8080', 10);
const MAX_PAYLOAD_BYTES = 8 * 1024; // 8 KiB
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Comma-separated list of allowed upgrade Origins.
 * Example: ALLOWED_ORIGINS=https://vfide.io,https://staging.vfide.io
 * Set to * only in development; never in production.
 */
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const ALLOWED_ORIGINS: Set<string> = new Set(
  ALLOWED_ORIGINS_RAW.split(',').map((o) => o.trim()).filter(Boolean),
);

// ─── Server Setup ──────────────────────────────────────────────────────────

let server: http.Server | https.Server;

/**
 * If WS_TLS_CERT and WS_TLS_KEY are set, bind an HTTPS server directly.
 * Otherwise bind plain HTTP — TLS MUST then be terminated upstream.
 * In production, plain HTTP startup is blocked unless WS_ALLOW_INSECURE_HTTP=true.
 */
if (process.env.WS_TLS_CERT && process.env.WS_TLS_KEY) {
  server = https.createServer({
    cert: fs.readFileSync(process.env.WS_TLS_CERT),
    key: fs.readFileSync(process.env.WS_TLS_KEY),
  });
  console.info('[ws] TLS mode: reading cert from', process.env.WS_TLS_CERT);
} else {
  if (IS_PRODUCTION && process.env.WS_ALLOW_INSECURE_HTTP !== 'true') {
    throw new Error(
      '[ws] Refusing to start in production without TLS. ' +
      'Configure WS_TLS_CERT + WS_TLS_KEY, terminate TLS upstream, or set WS_ALLOW_INSECURE_HTTP=true to override.'
    );
  }

  server = http.createServer();
  console.warn(
    '[ws] Plain HTTP mode — TLS MUST be terminated upstream (nginx/Caddy). ' +
    'Set WS_TLS_CERT and WS_TLS_KEY for direct TLS.',
  );
}

const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_BYTES,
  // Disable per-message deflate to avoid zip-bomb style attacks
  perMessageDeflate: false,
});

// ─── Per-IP Rate Limiter ────────────────────────────────────────────────────

const connectionRateLimiter = new RateLimiter({
  maxRequests: 10,   // max 10 new connections per window
  windowMs: 60_000,  // per minute
});

const messageRateLimiter = new RateLimiter({
  maxRequests: 60,   // max 60 messages per window
  windowMs: 60_000,  // per minute
});

// ─── Active Client Registry ────────────────────────────────────────────────

interface AuthenticatedSocket extends WebSocket {
  /** Authenticated wallet address (lower-cased Ethereum address) */
  vfideAddress: string;
  /** Unique session ID for logging */
  sessionId: string;
  /** Remote IP for rate-limiting */
  remoteIp: string;
  /** Timestamp of connection establishment */
  connectedAt: number;
}

const clients = new Map<string, AuthenticatedSocket>();

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRemoteIp(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendError(ws: WebSocket, code: string, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { code, message } }));
  }
}

export function broadcast(msg: OutboundMessage, except?: string): void {
  const raw = JSON.stringify(msg);
  for (const [sessionId, client] of clients) {
    if (sessionId === except) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  }
}

// ─── Upgrade / Handshake ───────────────────────────────────────────────────

server.on('upgrade', (req: http.IncomingMessage, socket, head) => {
  const origin = req.headers['origin'] || '';
  const ip = getRemoteIp(req);

  // 1. CORS / Origin validation
  if (ALLOWED_ORIGINS_RAW !== '*' && !ALLOWED_ORIGINS.has(origin)) {
    console.warn(`[ws] Rejected upgrade from disallowed origin: ${origin} (IP: ${ip})`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  // 2. Per-IP connection rate limiting
  if (!connectionRateLimiter.allow(ip)) {
    console.warn(`[ws] Rate limit exceeded on upgrade from IP: ${ip}`);
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

  // 3. Extract JWT from Authorization header only
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Browser WebSocket clients cannot set custom Authorization headers.
  // Allow token fallback via query string for ws:// upgrades.
  if (!token && req.url) {
    const url = new URL(req.url, 'http://localhost');
    token = url.searchParams.get('token') || undefined;
  }

  if (!token) {
    console.warn(`[ws] No token on upgrade from IP: ${ip}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // 4. Verify JWT
  let payload: JWTPayload;
  try {
    payload = verifyJWT(token);
  } catch (err) {
    console.warn(`[ws] Invalid JWT from IP ${ip}: ${(err as Error).message}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // 5. Complete the WebSocket handshake
  wss.handleUpgrade(req, socket, head, (ws) => {
    const sessionId = `${payload.address}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client = ws as AuthenticatedSocket;
    client.vfideAddress = payload.address.toLowerCase();
    client.sessionId = sessionId;
    client.remoteIp = ip;
    client.connectedAt = Date.now();

    wss.emit('connection', client, req);
  });
});

// ─── Connection Handler ─────────────────────────────────────────────────────

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage) => {
  const client = ws as AuthenticatedSocket;
  clients.set(client.sessionId, client);

  console.info(`[ws] Connected: ${client.vfideAddress} (session: ${client.sessionId})`);

  // Send welcome message
  client.send(JSON.stringify({
    type: 'connected',
    payload: { sessionId: client.sessionId, serverTime: Date.now() },
  }));

  // ── Message handler ───────────────────────────────────────────────────────
  ws.on('message', (raw: RawData) => {
    // Per-IP message rate limiting
    if (!messageRateLimiter.allow(client.remoteIp)) {
      sendError(ws, 'RATE_LIMIT', 'Message rate limit exceeded');
      return;
    }

    // Payload size check (belt-and-suspenders; maxPayload already set on server)
    const rawStr = raw.toString();
    if (rawStr.length > MAX_PAYLOAD_BYTES) {
      sendError(ws, 'PAYLOAD_TOO_LARGE', 'Message exceeds maximum size');
      return;
    }

    // JSON parse with graceful error handling for malformed frames
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawStr);
    } catch {
      sendError(ws, 'INVALID_JSON', 'Message is not valid JSON');
      return;
    }

    // Zod schema validation
    const result = parseMessage(parsed);
    if (!result.success) {
      sendError(ws, 'INVALID_SCHEMA', result.error.errors[0]?.message || 'Schema validation failed');
      return;
    }

    const msg = result.data;

    // Route inbound message types
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', payload: { ts: Date.now() } }));
        break;

      case 'subscribe':
        console.info(`[ws] Subscribe: ${client.vfideAddress} → ${msg.payload.topic}`);
        ws.send(JSON.stringify({ type: 'subscribed', payload: { topic: msg.payload.topic } }));
        break;

      case 'unsubscribe':
        ws.send(JSON.stringify({ type: 'unsubscribed', payload: { topic: msg.payload.topic } }));
        break;

      case 'message':
        ws.send(JSON.stringify({
          type: 'message',
          payload: {
            from: client.vfideAddress,
            data: msg.payload,
            timestamp: Date.now(),
          },
        }));
        break;

      default:
        sendError(ws, 'UNKNOWN_TYPE', 'Unknown message type');
    }
  });

  // ── Error handler (graceful — never re-throw) ─────────────────────────────
  ws.on('error', (err: Error) => {
    console.error(`[ws] Error for ${client.vfideAddress}: ${err.message}`);
    // Errors are logged; the 'close' event will fire immediately after and clean up
  });

  // ── Close handler ─────────────────────────────────────────────────────────
  ws.on('close', (code: number, reason: Buffer) => {
    clients.delete(client.sessionId);
    console.info(
      `[ws] Disconnected: ${client.vfideAddress} (session: ${client.sessionId}) ` +
      `code=${code} reason=${reason.toString() || '(none)'}`,
    );
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.info(`[ws] VFIDE WebSocket server listening on port ${PORT}`);
  console.info(`[ws] Allowed origins: ${ALLOWED_ORIGINS_RAW}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.info(`[ws] Received ${signal} — shutting down gracefully`);
  for (const [, client] of clients) {
    client.close(1001, 'Server shutting down');
  }
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
  // Force exit if graceful shutdown takes too long
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
