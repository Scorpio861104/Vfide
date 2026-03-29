/**
 * VFIDE WebSocket Server
 *
 * Security controls implemented (§26 audit checklist):
 *  ✅ Auth required via explicit `auth` message (JWT bearer token)
 *  ✅ Optional early JWT verification on upgrade (Authorization header only)
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
import { parseMessage, OutboundMessage, CURRENT_PROTOCOL_VERSION } from './schema';

// ─── Configuration ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WS_PORT || '8080', 10);
const MAX_PAYLOAD_BYTES = 8 * 1024; // 8 KiB
const AUTH_TIMEOUT_MS = parseInt(process.env.WS_AUTH_TIMEOUT_MS || '5000', 10);
const TOPIC_ACL_PATH = process.env.WS_TOPIC_ACL_PATH;
const TOPIC_ACL_REFRESH_MS = parseInt(process.env.WS_TOPIC_ACL_REFRESH_MS || '30000', 10);
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

// F-11 FIX: Reject wildcard origin in production to prevent accidental open-CORS deployment
if (IS_PRODUCTION && ALLOWED_ORIGINS.has('*')) {
  throw new Error('[ws] ALLOWED_ORIGINS=* is not permitted in production. Set explicit origin allowlist.');
}

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
  vfideAddress?: string;
  /** Whether the socket completed auth handshake */
  isAuthenticated: boolean;
  /** Unique session ID for logging */
  sessionId: string;
  /** Remote IP for rate-limiting */
  remoteIp: string;
  /** Timestamp of connection establishment */
  connectedAt: number;
  /** Auth timeout timer until first valid auth frame */
  authTimeoutTimer?: NodeJS.Timeout;
}

const clients = new Map<string, AuthenticatedSocket>();

type TopicAclSnapshot = {
  version: number;
  updatedAt: string;
  grants: Record<string, string[]>;
};

let topicAclSnapshot: TopicAclSnapshot | null = null;
let topicAclRefreshTimer: NodeJS.Timeout | null = null;

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

function isAllowedTopic(topic: string): boolean {
  if (topic === 'governance' || topic === 'notifications') {
    return true;
  }

  // Keep topic surface explicit to reduce accidental over-subscription.
  const topicPrefixes = ['chat.', 'proposal.', 'presence.'];
  return topicPrefixes.some((prefix) => topic.startsWith(prefix));
}

function loadTopicAclSnapshot(path: string): TopicAclSnapshot | null {
  try {
    const raw = fs.readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as TopicAclSnapshot;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('ACL snapshot must be an object');
    }

    if (parsed.version !== 1) {
      throw new Error(`ACL snapshot version must be 1; received ${parsed.version}`);
    }

    if (!Number.isFinite(Date.parse(parsed.updatedAt))) {
      throw new Error('ACL snapshot updatedAt must be a valid ISO date string');
    }

    if (!parsed.grants || typeof parsed.grants !== 'object') {
      throw new Error('ACL snapshot grants must be an object');
    }

    for (const [topicKey, addresses] of Object.entries(parsed.grants)) {
      if (!topicKey.trim()) {
        throw new Error('ACL snapshot topic key cannot be empty');
      }

      if (!Array.isArray(addresses)) {
        throw new Error(`ACL snapshot grants entry must be an array: ${topicKey}`);
      }

      for (const address of addresses) {
        if (typeof address !== 'string' || !address.trim()) {
          throw new Error(`ACL snapshot address entry must be a non-empty string: ${topicKey}`);
        }
      }
    }

    return parsed;
  } catch (err) {
    console.error(`[ws] Failed to load topic ACL snapshot from ${path}: ${(err as Error).message}`);
    return null;
  }
}

function refreshTopicAclSnapshot(path: string): void {
  const loaded = loadTopicAclSnapshot(path);
  if (!loaded) {
    return;
  }

  topicAclSnapshot = loaded;
  console.info(`[ws] Topic ACL snapshot refreshed (updatedAt=${loaded.updatedAt})`);
}

function startTopicAclRefresh(): void {
  if (!TOPIC_ACL_PATH) {
    console.warn('[ws] No WS_TOPIC_ACL_PATH configured; topic ACL refresh disabled (compatibility mode).');
    return;
  }

  refreshTopicAclSnapshot(TOPIC_ACL_PATH);

  if (TOPIC_ACL_REFRESH_MS > 0) {
    topicAclRefreshTimer = setInterval(() => {
      refreshTopicAclSnapshot(TOPIC_ACL_PATH);
    }, TOPIC_ACL_REFRESH_MS);
  }
}

function stopTopicAclRefresh(): void {
  if (topicAclRefreshTimer) {
    clearInterval(topicAclRefreshTimer);
    topicAclRefreshTimer = null;
  }
}

function topicMatchesGrant(topic: string, grantTopic: string): boolean {
  if (grantTopic === '*') {
    return true;
  }

  if (grantTopic.endsWith('*')) {
    return topic.startsWith(grantTopic.slice(0, -1));
  }

  return topic === grantTopic;
}

function isAuthorizedForTopic(client: AuthenticatedSocket, topic: string): boolean {
  if (!isAllowedTopic(topic)) {
    return false;
  }

  if (!TOPIC_ACL_PATH) {
    return true;
  }

  if (!topicAclSnapshot || !client.vfideAddress) {
    return false;
  }

  const address = client.vfideAddress.toLowerCase();
  for (const [grantTopic, addresses] of Object.entries(topicAclSnapshot.grants)) {
    if (!topicMatchesGrant(topic, grantTopic)) {
      continue;
    }

    if (addresses.includes('*') || addresses.map((entry) => entry.toLowerCase()).includes(address)) {
      return true;
    }
  }

  return false;
}

function authenticateClient(client: AuthenticatedSocket, token: string): boolean {
  const payload = verifyJWT(token);
  client.vfideAddress = payload.address.toLowerCase();
  client.isAuthenticated = true;
  if (client.authTimeoutTimer) {
    clearTimeout(client.authTimeoutTimer);
    client.authTimeoutTimer = undefined;
  }
  return true;
}

function getClientLabel(client: AuthenticatedSocket): string {
  return client.vfideAddress || 'unauthenticated';
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

  // 3. Extract optional JWT from Authorization header only
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 4. If provided, verify JWT during upgrade for fast-fail clients.
  let payload: JWTPayload | undefined;
  if (token) {
    try {
      payload = verifyJWT(token);
    } catch (err) {
      console.warn(`[ws] Invalid JWT from IP ${ip}: ${(err as Error).message}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  // 5. Complete the WebSocket handshake. Message-level auth is still required.
  wss.handleUpgrade(req, socket, head, (ws) => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client = ws as AuthenticatedSocket;
    client.vfideAddress = payload?.address?.toLowerCase();
    client.isAuthenticated = Boolean(payload);
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

  console.info(`[ws] Connected: ${getClientLabel(client)} (session: ${client.sessionId})`);

  if (!client.isAuthenticated) {
    client.authTimeoutTimer = setTimeout(() => {
      if (!client.isAuthenticated && client.readyState === WebSocket.OPEN) {
        sendError(client, 'AUTH_TIMEOUT', 'Authentication required within timeout window');
        client.close(4001, 'Authentication timeout');
      }
    }, AUTH_TIMEOUT_MS);
  }

  // Send welcome message
  client.send(JSON.stringify({
    type: 'connected',
    payload: {
      sessionId: client.sessionId,
      serverTime: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      authenticated: client.isAuthenticated,
    },
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
      sendError(ws, 'INVALID_SCHEMA', result.error.issues[0]?.message || 'Schema validation failed');
      return;
    }

    const msg = result.data;
    const messageVersion = msg.v ?? CURRENT_PROTOCOL_VERSION;
    if (messageVersion !== CURRENT_PROTOCOL_VERSION) {
      sendError(
        ws,
        'INVALID_PROTOCOL_VERSION',
        `Unsupported protocol version ${messageVersion}. Expected ${CURRENT_PROTOCOL_VERSION}`,
      );
      return;
    }

    if (msg.type !== 'auth' && !client.isAuthenticated) {
      sendError(ws, 'AUTH_REQUIRED', 'Authenticate before sending this message type');
      return;
    }

    // Route inbound message types
    switch (msg.type) {
      case 'auth':
        if (client.isAuthenticated) {
          sendError(ws, 'ALREADY_AUTHENTICATED', 'Socket is already authenticated');
          return;
        }
        try {
          authenticateClient(client, msg.payload.token);
          ws.send(JSON.stringify({
            type: 'authenticated',
            payload: {
              sessionId: client.sessionId,
              address: client.vfideAddress,
              authenticatedAt: Date.now(),
            },
          }));
          console.info(`[ws] Authenticated: ${getClientLabel(client)} (session: ${client.sessionId})`);
        } catch (err) {
          sendError(ws, 'AUTH_FAILED', (err as Error).message || 'Invalid token');
          ws.close(4001, 'Authentication failed');
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', payload: { ts: Date.now() } }));
        break;

      case 'subscribe':
        if (!isAuthorizedForTopic(client, msg.payload.topic)) {
          sendError(ws, 'UNAUTHORIZED_TOPIC', `Subscription denied for topic ${msg.payload.topic}`);
          return;
        }
        console.info(`[ws] Subscribe: ${getClientLabel(client)} → ${msg.payload.topic}`);
        ws.send(JSON.stringify({ type: 'subscribed', payload: { topic: msg.payload.topic } }));
        break;

      case 'unsubscribe':
        if (!isAuthorizedForTopic(client, msg.payload.topic)) {
          sendError(ws, 'UNAUTHORIZED_TOPIC', `Unsubscribe denied for topic ${msg.payload.topic}`);
          return;
        }
        ws.send(JSON.stringify({ type: 'unsubscribed', payload: { topic: msg.payload.topic } }));
        break;

      case 'message':
        ws.send(JSON.stringify({
          type: 'message',
          payload: {
            from: getClientLabel(client),
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
    console.error(`[ws] Error for ${getClientLabel(client)}: ${err.message}`);
    // Errors are logged; the 'close' event will fire immediately after and clean up
  });

  // ── Close handler ─────────────────────────────────────────────────────────
  ws.on('close', (code: number, reason: Buffer) => {
    if (client.authTimeoutTimer) {
      clearTimeout(client.authTimeoutTimer);
      client.authTimeoutTimer = undefined;
    }
    clients.delete(client.sessionId);
    console.info(
      `[ws] Disconnected: ${getClientLabel(client)} (session: ${client.sessionId}) ` +
      `code=${code} reason=${reason.toString() || '(none)'}`,
    );
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  startTopicAclRefresh();
  console.info(`[ws] VFIDE WebSocket server listening on port ${PORT}`);
  console.info(`[ws] Allowed origins: ${ALLOWED_ORIGINS_RAW}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.info(`[ws] Received ${signal} — shutting down gracefully`);
  stopTopicAclRefresh();
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
