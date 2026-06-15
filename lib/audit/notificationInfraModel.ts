/**
 * Notification Infrastructure — executable logic model (Backend Completion Campaign 1).
 *
 * Models VFIDE's notification system as traced from the actual code (NOT idealized):
 *   • Channels: IN-APP (`notifications` table + authed/rate-limited API), SMS (Africa's Talking + Twilio providers,
 *     graceful {success,error}), PUSH (web-push fanout to `push_subscriptions`, sent/failed accounting), and
 *     EMAIL — which has a preference but NO transport in the codebase (a real gap; modeled as undeliverable).
 *   • Creation authority: the create API enforces `canCreate = requester==target || isAdmin` (no cross-user
 *     forgery); cross-user notifications are created by PRIVILEGED server-side inserts in trusted route handlers.
 *   • Read / mark-read: RLS + query-scoped to the authenticated user's wallet.
 *   • Spam: rate-limited (read/write buckets).
 *   • Failure: SMS returns {success,error} per provider (no auto cross-provider failover); push counts sent/failed
 *     and drops expired subscriptions; server event persistence is best-effort and swallowed.
 *   • Escalation: `assessGuardianResilience` is a CONFIG-TIME warning (threshold==count → recovery fragile), NOT a
 *     delivery-time channel-fallback escalation.
 *
 * Findings this model encodes (characterised, not hidden): Email channel has no sender; escalation is a config
 * warning not delivery-escalation; dispatch is decentralized (no uniform per-preference fanout orchestrator).
 *
 * NOT the running service; an integration/e2e run is the deployment-level confirmation.
 */

export type Channel = 'inApp' | 'sms' | 'push' | 'email';
export type NotificationType =
  | 'recovery' | 'guardians' | 'proofOfLife' | 'inheritance' | 'commerce'
  | 'disputes' | 'governance' | 'trust' | 'fraud' | 'security';
export type Actor = 'self' | 'otherUser' | 'admin' | 'serverPrivileged';

export type R<T = void> = { ok: true; value?: T } | { ok: false; reason: string };
const OK = <T,>(value?: T): R<T> => ({ ok: true, value });
const E = (reason: string): R<never> => ({ ok: false, reason });

// ── Channel availability (the email gap is a fact of the codebase) ───────────
export function channelHasTransport(c: Channel): boolean {
  switch (c) {
    case 'inApp': return true;  // notifications table + API
    case 'sms': return true;    // Africa's Talking + Twilio
    case 'push': return true;   // web-push
    case 'email': return false; // NO transport implemented — finding
  }
}

// ── SMS providers (graceful failure; no auto cross-provider failover) ────────
export interface SmsCtx { provider: 'africastalking' | 'twilio'; configured: boolean; networkOk: boolean }
export function smsSend(ctx: SmsCtx): { success: boolean; provider: string; error?: string } {
  if (!ctx.configured) return { success: false, provider: ctx.provider, error: `${ctx.provider} not configured` };
  if (!ctx.networkOk) return { success: false, provider: ctx.provider, error: 'Request failed' };
  return { success: true, provider: ctx.provider };
}
/** There is NO automatic failover: a failed provider does not transparently retry the other. */
export function smsHasAutoFailover(): boolean { return false; }

// ── Push fanout (per-subscription isolation; expired subs dropped) ───────────
export interface PushSub { valid: boolean; expired: boolean }
export function pushFanout(subs: PushSub[]): { sent: number; failed: number } {
  let sent = 0, failed = 0;
  for (const s of subs) {
    if (s.expired || !s.valid) failed += 1; // dropped/cleaned; does not throw
    else sent += 1;
  }
  return { sent, failed };
}

// ── Server event persistence (best-effort, swallowed) ────────────────────────
export function emitServerEvent(persistOk: boolean): R {
  // A persistence failure is logged and swallowed — it must never break the primary operation.
  return OK(); // always returns control to the caller, regardless of persistOk
}
export function eventPersistenceIsBestEffort(): boolean { return true; }

// ── Creation authority (forgery resistance) ──────────────────────────────────
export function canCreateNotification(actor: Actor, requester: string, target: string, isAdmin: boolean): R {
  // API rule: requester == target || isAdmin. Server-privileged inserts (trusted route handlers) bypass the API.
  if (actor === 'serverPrivileged') return OK();
  if (actor === 'admin' && isAdmin) return OK();
  if (requester.toLowerCase() === target.toLowerCase()) return OK();
  return E('forbidden-cross-user-create'); // a user CANNOT forge a notification for another user
}

// ── Read / mark-read scoping ─────────────────────────────────────────────────
export function canRead(viewer: string, owner: string): R {
  if (viewer.toLowerCase() !== owner.toLowerCase()) return E('read-scoped-to-owner');
  return OK();
}
export function canMarkRead(viewer: string, owner: string): R {
  if (viewer.toLowerCase() !== owner.toLowerCase()) return E('mark-read-scoped-to-owner');
  return OK();
}

// ── Spam / rate limiting ─────────────────────────────────────────────────────
export interface RateState { countInWindow: number; limit: number }
export function rateLimited(s: RateState): boolean { return s.countInWindow >= s.limit; }

// ── Preferences (per-user, per-channel opt-in/out) ───────────────────────────
export interface Prefs { enabled: Record<Channel, boolean> }
/** A channel delivers only if (a) the user enabled it AND (b) it has a transport. */
export function willDeliver(c: Channel, prefs: Prefs): R {
  if (!prefs.enabled[c]) return E('channel-disabled-by-preference');
  if (!channelHasTransport(c)) return E('channel-has-no-transport'); // email lands here
  return OK();
}

// ── Escalation (config-time warning, NOT delivery-time fallback) ─────────────
export function guardianResilienceWarning(guardianCount: number, threshold: number): { fragile: boolean; warn: boolean } {
  // threshold == count → a single unreachable guardian makes recovery impossible → warn at config time.
  const fragile = threshold >= guardianCount && guardianCount > 0;
  return { fragile, warn: fragile };
}
/** There is no delivery-time escalation: an unacknowledged notification does not auto-escalate to another channel. */
export function hasDeliveryEscalation(): boolean { return false; }

// ── Type routing (all 10 types are valid notification types) ─────────────────
const TYPES: NotificationType[] = [
  'recovery', 'guardians', 'proofOfLife', 'inheritance', 'commerce',
  'disputes', 'governance', 'trust', 'fraud', 'security',
];
export function isValidType(t: string): t is NotificationType {
  return (TYPES as string[]).includes(t);
}
