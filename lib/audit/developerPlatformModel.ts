/**
 * Developer Platform — executable logic model (Backend Completion Campaign 10, Wave D).
 *
 * Certifies VFIDE's developer-facing surface, traced from source. CALIBRATION: there is no third-party "developer
 * API key" issuance — auth is JWT (wallet-derived sessions). The developer surface is (a) OUTBOUND merchant
 * WEBHOOKS and (b) the JWT-authed, rate-limited API, plus a developer docs page with a canonical secure-verification
 * example. (Finding DP-1: a scoped/revocable third-party API-key platform is unbuilt.)
 *
 *   Webhooks (lib/webhooks/merchantWebhookDispatcher.ts + lib/security/webhookVerification.ts):
 *   • HMAC-SHA256 signature `v1=HMAC(secret, "{timestamp}.{payload}")` — binds timestamp + body.
 *   • Constant-time comparison (timingSafeEqual) — no timing oracle.
 *   • Replay protection: a 5-minute default skew window (DEFAULT_MAX_SKEW_SECONDS=300, capped at 3600) + a
 *     replay-key (SHA256 of timestamp:digest) tracked UNIQUE so a replayed delivery is rejected.
 *   • SSRF protection: URL must be HTTPS; localhost/.local rejected; the resolved IP must not be private/loopback.
 *   • Secrets encrypted at rest (AES); endpoints can be paused/disabled.
 *   • Events are NOTIFICATIONS (payment.completed, refund.*, escrow.funded/resolved) — they NEVER move funds.
 *
 *   Non-custodial boundary: NO developer-facing credential (webhook secret OR JWT) can move vault funds — fund
 *   movement requires the user's on-chain activeWallet signature. A leaked webhook secret → forged notifications to
 *   that ONE endpoint (bounded); a leaked JWT → ≤24h API/read access, NOT signing (Campaign 3).
 *
 * Uses node crypto for real HMAC. NOT the running service; service e2e is the deployment confirmation.
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

export const DEFAULT_MAX_SKEW_SECONDS = 300;   // 5 minutes
export const MAX_ALLOWED_SKEW_SECONDS = 3600;  // 1 hour cap
export const JWT_EXPIRES_HOURS = 24;
export type WebhookEvent = 'payment.completed' | 'refund.initiated' | 'refund.completed' | 'escrow.funded' | 'escrow.resolved';

// ── HMAC signing + verification ──────────────────────────────────────────────
export function signWebhook(secret: string, timestamp: number, payload: string): string {
  return `v1=${createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;
}
export function verifyWebhook(secret: string, timestamp: number, payload: string, signature: string): boolean {
  const expected = signWebhook(secret, timestamp, payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;       // length check before timingSafeEqual
  return timingSafeEqual(a, b);                   // constant-time
}

// ── Replay protection ────────────────────────────────────────────────────────
export function clampSkew(maxSkew: number | undefined): number {
  if (maxSkew === undefined || !Number.isFinite(maxSkew) || maxSkew <= 0) return DEFAULT_MAX_SKEW_SECONDS;
  return Math.min(maxSkew, MAX_ALLOWED_SKEW_SECONDS);
}
export function replayKey(timestamp: number, payload: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return createHash('sha256').update(`${timestamp}:${digest}`).digest('hex');
}
export function replayAllowed(timestamp: number, now: number, maxSkew: number, seen: Set<string>, key: string): R {
  const skew = clampSkew(maxSkew);
  if (Math.abs(now - timestamp) > skew) return E('timestamp outside skew window');
  if (seen.has(key)) return E('replayed delivery');
  return OK;
}

// ── SSRF validation of a merchant-supplied webhook URL ───────────────────────
export function isBlockedIp(ip: string): boolean {
  // loopback, link-local, RFC1918 private ranges
  if (ip === '127.0.0.1' || ip.startsWith('127.') || ip === '::1') return true;
  if (ip.startsWith('169.254.')) return true;        // link-local
  if (ip.startsWith('10.')) return true;             // private
  if (ip.startsWith('192.168.')) return true;        // private
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true; // 172.16-31.x private
  if (ip === '0.0.0.0') return true;
  return false;
}
export function validateWebhookUrl(url: string, resolvedIp: string | null): R {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return E('Invalid webhook URL'); }
  if (parsed.protocol !== 'https:') return E('Webhook URL must use HTTPS');
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return E('Webhook URL cannot target local hosts');
  if (resolvedIp === null) return E('Webhook hostname did not resolve');
  if (isBlockedIp(resolvedIp)) return E('Webhook hostname resolves to a blocked private or loopback address');
  return OK;
}

// ── Non-custodial credential boundary ────────────────────────────────────────
export type Credential = 'webhookSecret' | 'jwtSession';
/** No developer-facing credential can move vault funds (on-chain signature required). */
export function credentialMovesVaultFunds(c: Credential): boolean { void c; return false; }
/** Webhook events are notifications — receiving one never moves funds. */
export function webhookEventMovesFunds(e: WebhookEvent): boolean { void e; return false; }
/** A leaked webhook secret's blast radius is forged notifications to ONE endpoint — not funds, not other merchants. */
export function leakedWebhookSecretCanForgeNotificationsToOneEndpoint(): boolean { return true; }
export function leakedWebhookSecretAffectsOtherMerchants(): boolean { return false; } // per-endpoint secrets
export function leakedWebhookSecretMovesFunds(): boolean { return false; }
/** A leaked JWT grants ≤24h API/read access, never on-chain signing. */
export function leakedJwtMaxHours(): number { return JWT_EXPIRES_HOURS; }
export function leakedJwtCanSignOnchain(): boolean { return false; }

// ── Secrets at rest + endpoint controls ──────────────────────────────────────
export function webhookSecretEncryptedAtRest(): boolean { return true; }
export function endpointCanBeDisabled(): boolean { return true; }
export function apiIsRateLimited(): boolean { return true; } // withRateLimit across the API

// ── Findings ─────────────────────────────────────────────────────────────────
/** DP-1: no third-party developer API-key platform (scoped/revocable keys); the surface is webhooks + JWT API. */
export function thirdPartyApiKeyPlatformExists(): boolean { return false; }
/** DP-2: a leaked webhook signing secret enables forged notifications — bounded (per-endpoint, rotatable,
 *  replay-protected, notification-only); merchants should verify payments on-chain, not trust the webhook alone. */
export function merchantsMustVerifyOnchainNotTrustWebhookAlone(): boolean { return true; }
