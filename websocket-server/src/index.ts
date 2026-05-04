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
import { timingSafeEqual } from 'crypto';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { verifyJWT, JWTPayload } from './auth';
import { RateLimiter } from './rateLimit';
import { parseMessage, OutboundMessage, CURRENT_PROTOCOL_VERSION } from './schema';

// ─── Configuration ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WS_PORT || '8080', 10);
const MAX_PAYLOAD_BYTES = 8 * 1024; // 8 KiB
const MAX_EVENT_BODY_BYTES = 64 * 1024; // 64 KiB cap for internal bridge endpoint

// WS-2 mitigation: Cap auth timeout at 30 seconds regardless of env var
// Prevents env var misconfiguration from allowing extremely long unauthenticated persistence
const AUTH_TIMEOUT_MS = Math.min(
  parseInt(process.env.WS_AUTH_TIMEOUT_MS || '5000', 10),
  30_000 // Maximum 30 seconds
);

const TOPIC_ACL_PATH = process.env.WS_TOPIC_ACL_PATH;
const TOPIC_ACL_REFRESH_MS_RAW = parseInt(process.env.WS_TOPIC_ACL_REFRESH_MS || '5000', 10);
const TOPIC_ACL_REFRESH_MS = Number.isFinite(TOPIC_ACL_REFRESH_MS_RAW)
  ? TOPIC_ACL_REFRESH_MS_RAW
  : 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// WS-1 mitigation: Require explicit proxy configuration to use X-Forwarded-For
// Defaults to false for security (direct address only) unless explicitly enabled
const TRUST_PROXY = process.env.WS_TRUST_PROXY === 'true';
if (IS_PRODUCTION && !TRUST_PROXY) {
  console.warn(
    '[ws] WS_TRUST_PROXY=false (default). ' +
    'X-Forwarded-For headers will be ignored. Set WS_TRUST_PROXY=true only if behind a trusted reverse proxy.'
  );
}

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
  noServer: true,
  maxPayload: MAX_PAYLOAD_BYTES,
  // Disable per-message deflate to avoid zip-bomb style attacks
  perMessageDeflate: false,
});

// Lightweight health probe for container/runtime monitoring.
// ─── Internal event bridge HTTP endpoint ─────────────────────────────────────
// N-L16 FIX: Accept POST /event from the Next.js backend (or any backend service)
// to push broadcast messages to connected subscribers.
//
// Authentication: shared secret via `x-internal-secret` header.
// Set WS_INTERNAL_SECRET env to a long random string; the Next.js API must send
// the same value. If the env is unset in production, all POST /event calls are
// rejected (fail-closed).
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || '';

if (IS_PRODUCTION && !WS_INTERNAL_SECRET) {
  console.warn('[ws] WARNING: WS_INTERNAL_SECRET is not set. POST /event will be rejected in production.');
}

server.on('request', (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // N-L16 FIX: internal broadcast bridge — Next.js and other backend services call
  // POST /event with a JSON body matching OutboundMessage to push events to subscribers.
  if (req.method === 'POST' && req.url === '/event') {
    const headerSecretRaw = req.headers['x-internal-secret'];
    const providedSecret = Array.isArray(headerSecretRaw) ? headerSecretRaw[0] : headerSecretRaw;

    let isAuthorized = false;
    if (WS_INTERNAL_SECRET && typeof providedSecret === 'string') {
      const expected = Buffer.from(WS_INTERNAL_SECRET, 'utf8');
      const provided = Buffer.from(providedSecret, 'utf8');
      if (expected.length === provided.length) {
        isAuthorized = timingSafeEqual(expected, provided);
      }
    }

    if (!isAuthorized) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    let bodySize = 0;
    req.on('data', (chunk: Buffer) => {
      bodySize += chunk.length;
      if (bodySize > MAX_EVENT_BODY_BYTES) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const msg = JSON.parse(body) as OutboundMessage;
        broadcast(msg);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── Per-IP Rate Limiter ────────────────────────────────────────────────────

const connectionRateLimiter = new RateLimiter({
  name: 'connection',
  maxRequests: 10,   // max 10 new connections per window
  windowMs: 60_000,  // per minute
});

const messageRateLimiter = new RateLimiter({
  name: 'message',
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
  /** Topics currently subscribed by this session */
  subscribedTopics: Set<string>;
}

const clients = new Map<string, AuthenticatedSocket>();
const topicSubscribers = new Map<string, Set<string>>();

type TopicAclSnapshot = {
  version: number;
  updatedAt: string;
  grants: Record<string, string[]>;
};

let topicAclSnapshot: TopicAclSnapshot | null = null;
let topicAclRefreshTimer: NodeJS.Timeout | null = null;
let topicAclLoadedAtMs = 0;
let topicAclFileMtimeMs = 0;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRemoteIp(req: http.IncomingMessage): string {
  // WS-1 mitigation: Only trust X-Forwarded-For if explicitly enabled and behind trusted proxy
  if (TRUST_PROXY) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      // X-Forwarded-For format: "client, proxy1, proxy2"
      // In a reverse proxy setup, take the first value (original client IP)
      return forwarded.split(',')[0].trim();
    }
  }
  
  // Fallback to direct socket address (only source of truth when not behind proxy)
  return req.socket.remoteAddress || 'unknown';
}

function sendError(ws: WebSocket, code: string, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { code, message } }));
  }
}

/**
 * Return the canonical chat topic for two participants.
 * Addresses are lower-cased and sorted so the same pair always maps to the same topic.
 */
export function chatTopic(addrA: string, addrB: string): string {
  const sorted = [addrA.toLowerCase(), addrB.toLowerCase()].sort();
  return `chat.${sorted[0]}_${sorted[1]}`;
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
  let fileMtimeMs = 0;
  try {
    fileMtimeMs = fs.statSync(path).mtimeMs;
  } catch {
    // Fall through to loader for canonical error handling.
  }

  const loaded = loadTopicAclSnapshot(path);
  if (!loaded) {
    return;
  }

  topicAclSnapshot = loaded;
  topicAclLoadedAtMs = Date.now();
  topicAclFileMtimeMs = fileMtimeMs;
  console.info(`[ws] Topic ACL snapshot refreshed (updatedAt=${loaded.updatedAt})`);
}

function ensureFreshTopicAclSnapshot(forceFileCheck: boolean): void {
  if (!TOPIC_ACL_PATH || TOPIC_ACL_REFRESH_MS <= 0) {
    return;
  }

  let shouldRefresh = topicAclLoadedAtMs === 0 || Date.now() - topicAclLoadedAtMs > TOPIC_ACL_REFRESH_MS;

  if (forceFileCheck) {
    try {
      const currentMtimeMs = fs.statSync(TOPIC_ACL_PATH).mtimeMs;
      if (currentMtimeMs > topicAclFileMtimeMs) {
        shouldRefresh = true;
      }
    } catch {
      // Ignore stat failures here; loader/interval refresh path logs canonical errors.
    }
  }

  if (shouldRefresh) {
    refreshTopicAclSnapshot(TOPIC_ACL_PATH);
  }
}

function startTopicAclRefresh(): void {
  if (!TOPIC_ACL_PATH) {
    if (IS_PRODUCTION) {
      console.error('[ws] FATAL: WS_TOPIC_ACL_PATH is required in production.');
      process.exit(1);
    }
    console.warn('[ws] No WS_TOPIC_ACL_PATH configured; topic ACL is fail-closed.');
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

function isAuthorizedForTopic(client: AuthenticatedSocket, topic: string, refreshForSubscribe = false): boolean {
  if (!isAllowedTopic(topic)) {
    return false;
  }

  if (!client.vfideAddress) {
    return false;
  }

  if (topic.startsWith('chat.')) {
    const participants = topic.slice('chat.'.length).split('_');
    if (participants.length !== 2) return false;
    const [a, b] = participants.map((entry) => entry.toLowerCase());
    const addrRe = /^0x[a-f0-9]{40}$/;
    if (!addrRe.test(a) || !addrRe.test(b) || a >= b) return false;
    const me = client.vfideAddress.toLowerCase();
    return me === a || me === b;
  }

  if (topic.startsWith('presence.')) {
    const subject = topic.slice('presence.'.length).toLowerCase();
    return /^0x[a-f0-9]{40}$/.test(subject) && subject === client.vfideAddress.toLowerCase();
  }

  if (!TOPIC_ACL_PATH) {
    return false;
  }

  // For subscription checks, include file-change probing so ACL updates can be
  // enforced immediately. Delivery checks rely on interval freshness to avoid
  // synchronous fs.stat calls per message fanout.
  ensureFreshTopicAclSnapshot(refreshForSubscribe);

  if (!topicAclSnapshot) {
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

async function authenticateClient(client: AuthenticatedSocket, token: string): Promise<boolean> {
  const payload = await verifyJWT(token);
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
  const topic = extractTopicFromOutbound(msg);

  if (topic) {
    const subscriberSessions = topicSubscribers.get(topic);
    if (!subscriberSessions || subscriberSessions.size === 0) {
      return;
    }

    const rawTopic = JSON.stringify(msg);
    for (const sessionId of subscriberSessions) {
      if (sessionId === except) continue;

      const client = clients.get(sessionId);
      if (!client || client.readyState !== WebSocket.OPEN) {
        continue;
      }

      // Enforce ACL at delivery-time in addition to subscription-time.
      if (!isAuthorizedForTopic(client, topic)) {
        unsubscribeClientFromTopic(client, topic);
        continue;
      }

      client.send(rawTopic);
    }
    return;
  }

  console.warn('[ws] Dropping outbound message with missing topic (fail-closed broadcast policy).');
}

function extractTopicFromOutbound(msg: OutboundMessage): string | null {
  const topic = (msg.payload as Record<string, unknown> | undefined)?.topic;
  if (typeof topic !== 'string' || topic.length === 0) {
    return null;
  }
  return topic;
}

function subscribeClientToTopic(client: AuthenticatedSocket, topic: string): void {
  client.subscribedTopics.add(topic);
  const subscribers = topicSubscribers.get(topic) || new Set<string>();
  subscribers.add(client.sessionId);
  topicSubscribers.set(topic, subscribers);
}

function unsubscribeClientFromTopic(client: AuthenticatedSocket, topic: string): void {
  client.subscribedTopics.delete(topic);
  const subscribers = topicSubscribers.get(topic);
  if (!subscribers) return;
  subscribers.delete(client.sessionId);
  if (subscribers.size === 0) {
    topicSubscribers.delete(topic);
  }
}

function unsubscribeClientFromAllTopics(client: AuthenticatedSocket): void {
  if (!client.subscribedTopics) {
    return;
  }

  for (const topic of client.subscribedTopics) {
    unsubscribeClientFromTopic(client, topic);
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

  connectionRateLimiter.allow(ip)
    .then((allowed) => {
      // 2. Per-IP connection rate limiting
      if (!allowed) {
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
      const proceed = (payload?: JWTPayload): void => {
        // 5. Complete the WebSocket handshake. Message-level auth is still required.
        wss.handleUpgrade(req, socket, head, (ws) => {
          const sessionId = `session-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
          const client = ws as AuthenticatedSocket;
          client.vfideAddress = payload?.address?.toLowerCase();
          client.isAuthenticated = Boolean(payload);
          client.sessionId = sessionId;
          client.remoteIp = ip;
          client.connectedAt = Date.now();
          client.subscribedTopics = new Set<string>();

          wss.emit('connection', client, req);
        });
      };

      if (!token) {
        proceed();
        return;
      }

      verifyJWT(token)
        .then((payload) => {
          if (!socket.destroyed) proceed(payload);
        })
        .catch((err) => {
          console.warn(`[ws] Invalid JWT from IP ${ip}: ${(err as Error).message}`);
          if (!socket.destroyed) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
          }
        });
    })
    .catch((err) => {
      console.error(`[ws] Connection rate limiter error for IP ${ip}: ${(err as Error).message}`);
      if (!socket.destroyed) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
      }
    });
});

// ─── Connection Handler ─────────────────────────────────────────────────────

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage) => {
  const client = ws as AuthenticatedSocket;
  // Defensive defaults in case upstream wiring changes.
  if (!client.sessionId) {
    client.sessionId = `session-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  if (!client.remoteIp) {
    client.remoteIp = 'unknown';
  }
  if (!client.subscribedTopics) {
    client.subscribedTopics = new Set<string>();
  }
  if (!client.connectedAt) {
    client.connectedAt = Date.now();
  }
  if (typeof client.isAuthenticated !== 'boolean') {
    client.isAuthenticated = false;
  }

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
  ws.on('message', async (raw: RawData) => {
    // Per-IP message rate limiting
    try {
      if (!(await messageRateLimiter.allow(client.remoteIp))) {
        sendError(ws, 'RATE_LIMIT', 'Message rate limit exceeded');
        return;
      }
    } catch (err) {
      console.error(`[ws] Message rate limiter error for ${client.remoteIp}: ${(err as Error).message}`);
      sendError(ws, 'RATE_LIMIT_UNAVAILABLE', 'Rate limiter unavailable');
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
          await authenticateClient(client, msg.payload.token);
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
        if (!isAuthorizedForTopic(client, msg.payload.topic, true)) {
          sendError(ws, 'UNAUTHORIZED_TOPIC', `Subscription denied for topic ${msg.payload.topic}`);
          return;
        }
        subscribeClientToTopic(client, msg.payload.topic);
        console.info(`[ws] Subscribe: ${getClientLabel(client)} → ${msg.payload.topic}`);
        ws.send(JSON.stringify({ type: 'subscribed', payload: { topic: msg.payload.topic } }));
        break;

      case 'unsubscribe':
        if (!isAllowedTopic(msg.payload.topic)) {
          sendError(ws, 'UNAUTHORIZED_TOPIC', `Unsubscribe denied for topic ${msg.payload.topic}`);
          return;
        }
        unsubscribeClientFromTopic(client, msg.payload.topic);
        ws.send(JSON.stringify({ type: 'unsubscribed', payload: { topic: msg.payload.topic } }));
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
    unsubscribeClientFromAllTopics(client);
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
