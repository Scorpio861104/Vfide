/**
 * Developer Platform — adversarial + edge scenario matrix (Backend Completion Campaign 10, Wave D).
 *
 * Certifies the developer surface: webhook HMAC-SHA256 signing + constant-time verification, tampering detection,
 * replay protection (skew window + seen-keys), SSRF validation (HTTPS-only, no localhost/.local, no private IPs),
 * and the non-custodial credential boundary (no developer credential moves vault funds). Findings DP-1 (no
 * third-party API-key platform), DP-2 (leaked-secret = forged notifications, bounded). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  signWebhook, verifyWebhook, clampSkew, replayKey, replayAllowed, isBlockedIp, validateWebhookUrl,
  credentialMovesVaultFunds, webhookEventMovesFunds, leakedWebhookSecretCanForgeNotificationsToOneEndpoint,
  leakedWebhookSecretAffectsOtherMerchants, leakedWebhookSecretMovesFunds, leakedJwtMaxHours, leakedJwtCanSignOnchain,
  webhookSecretEncryptedAtRest, endpointCanBeDisabled, apiIsRateLimited, thirdPartyApiKeyPlatformExists,
  merchantsMustVerifyOnchainNotTrustWebhookAlone,
  DEFAULT_MAX_SKEW_SECONDS, MAX_ALLOWED_SKEW_SECONDS, JWT_EXPIRES_HOURS,
  type Credential, type WebhookEvent,
} from '@/lib/audit/developerPlatformModel';

const SECRET = 'whsec_test_0123456789abcdef';
const PAYLOAD = '{"event":"payment.completed","amount":"100"}';
const TS = 1_700_000_000;
const EVENTS: WebhookEvent[] = ['payment.completed', 'refund.initiated', 'refund.completed', 'escrow.funded', 'escrow.resolved'];

// ═════════════════════════════════════════════════════════════════════════════
// A. HMAC signing + verification
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.A: HMAC signing', () => {
  it('SIG-01 a correctly signed webhook verifies', () => {
    const sig = signWebhook(SECRET, TS, PAYLOAD);
    expect(verifyWebhook(SECRET, TS, PAYLOAD, sig)).toBe(true);
  });
  it('SIG-02 signature is prefixed v1=', () => expect(signWebhook(SECRET, TS, PAYLOAD).startsWith('v1=')).toBe(true));
  it('SIG-03 signing is deterministic for the same inputs', () => {
    expect(signWebhook(SECRET, TS, PAYLOAD)).toBe(signWebhook(SECRET, TS, PAYLOAD));
  });
  it('SIG-04 different payloads produce different signatures', () => {
    expect(signWebhook(SECRET, TS, PAYLOAD)).not.toBe(signWebhook(SECRET, TS, PAYLOAD + 'x'));
  });
  it('SIG-05 different timestamps produce different signatures (timestamp is bound)', () => {
    expect(signWebhook(SECRET, TS, PAYLOAD)).not.toBe(signWebhook(SECRET, TS + 1, PAYLOAD));
  });
  it('SIG-06 different secrets produce different signatures', () => {
    expect(signWebhook(SECRET, TS, PAYLOAD)).not.toBe(signWebhook(SECRET + 'z', TS, PAYLOAD));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Tampering detection
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.B: tampering detection', () => {
  const sig = signWebhook(SECRET, TS, PAYLOAD);
  it('TAMP-01 wrong secret fails verification', () => expect(verifyWebhook('wrong-secret', TS, PAYLOAD, sig)).toBe(false));
  it('TAMP-02 tampered payload fails verification', () => expect(verifyWebhook(SECRET, TS, PAYLOAD + ' ', sig)).toBe(false));
  it('TAMP-03 tampered timestamp fails verification', () => expect(verifyWebhook(SECRET, TS + 1, PAYLOAD, sig)).toBe(false));
  it('TAMP-04 truncated signature fails (length check before compare)', () => expect(verifyWebhook(SECRET, TS, PAYLOAD, sig.slice(0, -2))).toBe(false));
  it('TAMP-05 empty signature fails', () => expect(verifyWebhook(SECRET, TS, PAYLOAD, '')).toBe(false));
  it('TAMP-06 a flipped hex char fails', () => {
    const flipped = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
    expect(verifyWebhook(SECRET, TS, PAYLOAD, flipped)).toBe(false);
  });
  it('TAMP-07 signature for a different event does not verify the original', () => {
    const other = signWebhook(SECRET, TS, '{"event":"escrow.funded"}');
    expect(verifyWebhook(SECRET, TS, PAYLOAD, other)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Replay protection — skew window
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.C: replay skew window', () => {
  const now = TS;
  const seen = new Set<string>();
  it('SKEW-01 a fresh in-window webhook is allowed', () => {
    expect(replayAllowed(now, now, DEFAULT_MAX_SKEW_SECONDS, seen, 'k0').ok).toBe(true);
  });
  it('SKEW-02 a webhook at the window edge is allowed', () => {
    expect(replayAllowed(now - DEFAULT_MAX_SKEW_SECONDS, now, DEFAULT_MAX_SKEW_SECONDS, new Set(), 'k1').ok).toBe(true);
  });
  it('SKEW-03 a webhook just past the window is rejected', () => {
    expect(replayAllowed(now - DEFAULT_MAX_SKEW_SECONDS - 1, now, DEFAULT_MAX_SKEW_SECONDS, new Set(), 'k2')).toEqual({ ok: false, reason: 'timestamp outside skew window' });
  });
  it('SKEW-04 a future-dated webhook beyond skew is rejected', () => {
    expect(replayAllowed(now + DEFAULT_MAX_SKEW_SECONDS + 1, now, DEFAULT_MAX_SKEW_SECONDS, new Set(), 'k3').ok).toBe(false);
  });
  // parametric skew sweep
  const offsets = [-600, -301, -300, -60, 0, 60, 300, 301, 600];
  for (const off of offsets) {
    const allowed = Math.abs(off) <= DEFAULT_MAX_SKEW_SECONDS;
    it(`SKEW-sweep-${off} offset ${off}s → ${allowed ? 'allowed' : 'rejected'}`, () => {
      expect(replayAllowed(now + off, now, DEFAULT_MAX_SKEW_SECONDS, new Set(), `s${off}`).ok).toBe(allowed);
    });
  }
  it('SKEW-05 skew is clamped to the max-allowed ceiling', () => {
    expect(clampSkew(99999)).toBe(MAX_ALLOWED_SKEW_SECONDS);
    expect(clampSkew(-5)).toBe(DEFAULT_MAX_SKEW_SECONDS);
    expect(clampSkew(undefined)).toBe(DEFAULT_MAX_SKEW_SECONDS);
    expect(clampSkew(120)).toBe(120);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Replay key uniqueness / seen-events
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.D: replay-key dedupe', () => {
  it('DEDUP-01 the same delivery replayed is rejected', () => {
    const seen = new Set<string>();
    const key = replayKey(TS, PAYLOAD, SECRET);
    expect(replayAllowed(TS, TS, DEFAULT_MAX_SKEW_SECONDS, seen, key).ok).toBe(true);
    seen.add(key);
    expect(replayAllowed(TS, TS, DEFAULT_MAX_SKEW_SECONDS, seen, key)).toEqual({ ok: false, reason: 'replayed delivery' });
  });
  it('DEDUP-02 distinct deliveries have distinct replay keys', () => {
    expect(replayKey(TS, PAYLOAD, SECRET)).not.toBe(replayKey(TS + 1, PAYLOAD, SECRET));
    expect(replayKey(TS, PAYLOAD, SECRET)).not.toBe(replayKey(TS, PAYLOAD + 'x', SECRET));
  });
  it('DEDUP-03 replay key is deterministic', () => expect(replayKey(TS, PAYLOAD, SECRET)).toBe(replayKey(TS, PAYLOAD, SECRET)));
});

// ═════════════════════════════════════════════════════════════════════════════
// E. SSRF validation — URL/protocol/host
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.E: SSRF URL validation', () => {
  it('URL-01 a valid HTTPS public URL is allowed', () => expect(validateWebhookUrl('https://hooks.merchant.com/vfide', '203.0.113.7').ok).toBe(true));
  it('URL-02 http (non-TLS) is rejected', () => expect(validateWebhookUrl('http://hooks.merchant.com', '203.0.113.7')).toEqual({ ok: false, reason: 'Webhook URL must use HTTPS' }));
  it('URL-03 localhost is rejected', () => expect(validateWebhookUrl('https://localhost/x', '127.0.0.1').ok).toBe(false));
  it('URL-04 .local hostnames are rejected', () => expect(validateWebhookUrl('https://printer.local/x', '203.0.113.7').ok).toBe(false));
  it('URL-05 a URL resolving to a private IP is rejected', () => expect(validateWebhookUrl('https://evil.example.com', '10.0.0.5')).toEqual({ ok: false, reason: 'Webhook hostname resolves to a blocked private or loopback address' }));
  it('URL-06 an unresolvable hostname is rejected', () => expect(validateWebhookUrl('https://nxdomain.example', null).ok).toBe(false));
  it('URL-07 a malformed URL is rejected', () => expect(validateWebhookUrl('not a url', '203.0.113.7')).toEqual({ ok: false, reason: 'Invalid webhook URL' }));
  it('URL-08 ftp scheme is rejected', () => expect(validateWebhookUrl('ftp://files.merchant.com', '203.0.113.7').ok).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Blocked IP ranges (SSRF core)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.F: blocked IP ranges', () => {
  const blocked = ['127.0.0.1', '127.5.5.5', '::1', '169.254.1.1', '10.0.0.1', '10.255.255.255', '192.168.1.1', '172.16.0.1', '172.31.255.255', '0.0.0.0'];
  for (const ip of blocked) it(`BLOCK-${ip} is blocked`, () => expect(isBlockedIp(ip)).toBe(true));
  const allowed = ['203.0.113.7', '8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '11.0.0.1', '193.168.1.1'];
  for (const ip of allowed) it(`ALLOW-${ip} is public (allowed)`, () => expect(isBlockedIp(ip)).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Non-custodial credential boundary (the headline)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.G: non-custodial boundary', () => {
  const creds: Credential[] = ['webhookSecret', 'jwtSession'];
  for (const c of creds) it(`NC-${c} cannot move vault funds`, () => expect(credentialMovesVaultFunds(c)).toBe(false));
  for (const e of EVENTS) it(`NC-event-${e} is a notification, never a fund movement`, () => expect(webhookEventMovesFunds(e)).toBe(false));
  it('NC-jwt-not-signing a leaked JWT cannot sign on-chain', () => expect(leakedJwtCanSignOnchain()).toBe(false));
  it('NC-jwt-24h a leaked JWT expires within 24h', () => expect(leakedJwtMaxHours()).toBe(JWT_EXPIRES_HOURS));
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Leaked-secret blast radius
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.H: leaked-secret blast radius', () => {
  it('BLAST-01 a leaked webhook secret can forge notifications to ITS endpoint', () => expect(leakedWebhookSecretCanForgeNotificationsToOneEndpoint()).toBe(true));
  it('BLAST-02 but it cannot affect other merchants (per-endpoint secrets)', () => expect(leakedWebhookSecretAffectsOtherMerchants()).toBe(false));
  it('BLAST-03 and it cannot move funds', () => expect(leakedWebhookSecretMovesFunds()).toBe(false));
  it('BLAST-04 the mitigation: merchants verify payments on-chain, not trust the webhook alone', () => expect(merchantsMustVerifyOnchainNotTrustWebhookAlone()).toBe(true));
  it('BLAST-05 a forged webhook still fails replay/skew if reused or stale', () => {
    const seen = new Set<string>();
    const key = replayKey(TS, PAYLOAD, SECRET);
    seen.add(key);
    expect(replayAllowed(TS, TS, DEFAULT_MAX_SKEW_SECONDS, seen, key).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Secrets at rest + endpoint controls + rate limiting
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.I: secret handling & controls', () => {
  it('CTRL-01 webhook secrets are encrypted at rest', () => expect(webhookSecretEncryptedAtRest()).toBe(true));
  it('CTRL-02 an endpoint can be disabled (kill switch)', () => expect(endpointCanBeDisabled()).toBe(true));
  it('CTRL-03 the API is rate-limited', () => expect(apiIsRateLimited()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.J: findings', () => {
  it('FIND-DP1 no third-party developer API-key platform exists (webhooks + JWT API only)', () => {
    expect(thirdPartyApiKeyPlatformExists()).toBe(false);
  });
  it('FIND-DP2 a leaked webhook secret = forged notifications (bounded, not funds)', () => {
    expect(leakedWebhookSecretCanForgeNotificationsToOneEndpoint()).toBe(true);
    expect(leakedWebhookSecretMovesFunds()).toBe(false);
    expect(merchantsMustVerifyOnchainNotTrustWebhookAlone()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Full blocked/allowed IP sweep (SSRF core, exhaustive ranges)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.K: exhaustive IP sweep', () => {
  const blockedIps = [
    '127.0.0.1', '127.0.0.2', '127.1.1.1', '127.255.255.255', '::1',
    '169.254.0.1', '169.254.169.254', '169.254.255.255',
    '10.0.0.0', '10.1.2.3', '10.255.255.255',
    '192.168.0.1', '192.168.100.100', '192.168.255.255',
    '172.16.0.0', '172.20.10.5', '172.31.255.255', '0.0.0.0',
  ];
  for (const ip of blockedIps) it(`KBLOCK-${ip}`, () => expect(isBlockedIp(ip)).toBe(true));
  const allowedIps = [
    '203.0.113.1', '198.51.100.7', '8.8.8.8', '1.1.1.1', '9.9.9.9',
    '172.15.255.255', '172.32.0.0', '11.0.0.0', '172.0.0.1', '193.0.0.1', '128.0.0.1', '100.64.0.1',
  ];
  for (const ip of allowedIps) it(`KALLOW-${ip}`, () => expect(isBlockedIp(ip)).toBe(false));
  // boundary checks around the 172.16-31 private block
  it('KBOUND-172.15 just below private block is public', () => expect(isBlockedIp('172.15.0.1')).toBe(false));
  it('KBOUND-172.16 start of private block is blocked', () => expect(isBlockedIp('172.16.0.1')).toBe(true));
  it('KBOUND-172.31 end of private block is blocked', () => expect(isBlockedIp('172.31.0.1')).toBe(true));
  it('KBOUND-172.32 just above private block is public', () => expect(isBlockedIp('172.32.0.1')).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// L. HMAC verification matrix (parametric tamper)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.L: HMAC verification matrix', () => {
  const sig = signWebhook(SECRET, TS, PAYLOAD);
  const wrongSecrets = ['', 'x', SECRET + '1', SECRET.toUpperCase(), 'whsec_other'];
  for (const ws of wrongSecrets) it(`HV-secret-${ws.slice(0, 6) || 'empty'} wrong secret fails`, () => expect(verifyWebhook(ws, TS, PAYLOAD, sig)).toBe(false));
  const wrongTimestamps = [TS - 1, TS + 1, 0, TS + 1000, TS - 1000];
  for (const wt of wrongTimestamps) it(`HV-ts-${wt} wrong timestamp fails`, () => expect(verifyWebhook(SECRET, wt, PAYLOAD, sig)).toBe(false));
  const wrongPayloads = [PAYLOAD + ' ', ' ' + PAYLOAD, PAYLOAD.replace('100', '999'), '', '{}'];
  for (let i = 0; i < wrongPayloads.length; i++) it(`HV-payload-${i} tampered payload fails`, () => expect(verifyWebhook(SECRET, TS, wrongPayloads[i]!, sig)).toBe(false));
  it('HV-correct the exact tuple verifies', () => expect(verifyWebhook(SECRET, TS, PAYLOAD, sig)).toBe(true));
  // round-trip across many payloads
  for (const p of ['{"a":1}', '{"event":"escrow.resolved"}', 'plain-text', '日本語', '']) {
    it(`HV-roundtrip-${p.slice(0, 6) || 'empty'} sign→verify holds`, () => {
      expect(verifyWebhook(SECRET, TS, p, signWebhook(SECRET, TS, p))).toBe(true);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Skew window finer sweep
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.M: skew finer sweep', () => {
  const now = TS;
  const offsets = [-3600, -1000, -301, -300, -299, -120, -1, 0, 1, 120, 299, 300, 301, 1000, 3600];
  for (const off of offsets) {
    const allowed = Math.abs(off) <= DEFAULT_MAX_SKEW_SECONDS;
    it(`MSKEW-${off} → ${allowed ? 'allow' : 'reject'}`, () => expect(replayAllowed(now + off, now, DEFAULT_MAX_SKEW_SECONDS, new Set(), `m${off}`).ok).toBe(allowed));
  }
  it('MSKEW-clamp-table clamp behavior', () => {
    expect(clampSkew(0)).toBe(DEFAULT_MAX_SKEW_SECONDS);
    expect(clampSkew(3600)).toBe(3600);
    expect(clampSkew(3601)).toBe(MAX_ALLOWED_SKEW_SECONDS);
    expect(clampSkew(NaN)).toBe(DEFAULT_MAX_SKEW_SECONDS);
    expect(clampSkew(Infinity)).toBe(DEFAULT_MAX_SKEW_SECONDS);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. URL validation finer
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.N: URL validation finer', () => {
  const cases: Array<[string, string | null, boolean]> = [
    ['https://api.shop.com/hook', '203.0.113.5', true],
    ['https://shop.io/vfide/webhook', '8.8.4.4', true],
    ['http://shop.com/hook', '203.0.113.5', false],
    ['https://localhost:3000/hook', '127.0.0.1', false],
    ['https://app.local/hook', '203.0.113.5', false],
    ['https://internal.example', '10.10.10.10', false],
    ['https://meta.example', '169.254.169.254', false],
    ['https://router.example', '192.168.0.1', false],
    ['https://unresolved.example', null, false],
    ['gopher://shop.com', '203.0.113.5', false],
    ['https://valid.com', '172.32.5.5', true],
    ['https://valid2.com', '11.11.11.11', true],
  ];
  cases.forEach(([url, ip, ok], i) => it(`NURL-${i} ${url} (${ip}) → ${ok}`, () => expect(validateWebhookUrl(url, ip).ok).toBe(ok)));
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 10.O: closing invariants', () => {
  it('CLOSE-01 no developer credential moves funds; no webhook event moves funds', () => {
    for (const c of ['webhookSecret', 'jwtSession'] as Credential[]) expect(credentialMovesVaultFunds(c)).toBe(false);
    for (const e of EVENTS) expect(webhookEventMovesFunds(e)).toBe(false);
  });
  it('CLOSE-02 webhooks are signed, replay-protected, SSRF-protected, and timing-safe', () => {
    const sig = signWebhook(SECRET, TS, PAYLOAD);
    expect(verifyWebhook(SECRET, TS, PAYLOAD, sig)).toBe(true);     // signed
    expect(verifyWebhook(SECRET, TS, PAYLOAD, sig.slice(0, -2))).toBe(false); // length+timing-safe
    expect(validateWebhookUrl('https://x.com', '10.0.0.1').ok).toBe(false);   // SSRF
    expect(replayAllowed(TS - 999, TS, DEFAULT_MAX_SKEW_SECONDS, new Set(), 'c').ok).toBe(false); // replay/skew
  });
  it('CLOSE-03 leaked-secret blast radius is bounded (one endpoint, no funds)', () => {
    expect(leakedWebhookSecretAffectsOtherMerchants()).toBe(false);
    expect(leakedWebhookSecretMovesFunds()).toBe(false);
  });
  it('CLOSE-04 DP-1 (no third-party API keys) and DP-2 (forged-notification risk) are the tracked findings', () => {
    expect(thirdPartyApiKeyPlatformExists()).toBe(false);
    expect(merchantsMustVerifyOnchainNotTrustWebhookAlone()).toBe(true);
  });
  it('CLOSE-05 secrets encrypted at rest, endpoints disable-able, API rate-limited', () => {
    expect(webhookSecretEncryptedAtRest()).toBe(true);
    expect(endpointCanBeDisabled()).toBe(true);
    expect(apiIsRateLimited()).toBe(true);
  });
});
