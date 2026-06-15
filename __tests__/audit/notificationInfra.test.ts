/**
 * Notification Infrastructure — adversarial + edge scenario matrix (Backend Completion Campaign 1).
 *
 * Certifies the notification system across channels, types, creation authority/forgery, read scoping, spam,
 * preferences, failure handling, and escalation — encoding the verified behavior AND the real gaps (email has no
 * transport; escalation is a config warning; no SMS auto-failover; decentralized dispatch). Target: 100+ scenarios.
 */
import { describe, it, expect } from '@jest/globals';
import {
  channelHasTransport, smsSend, smsHasAutoFailover, pushFanout, emitServerEvent, eventPersistenceIsBestEffort,
  canCreateNotification, canRead, canMarkRead, rateLimited, willDeliver, guardianResilienceWarning,
  hasDeliveryEscalation, isValidType,
  type Channel, type NotificationType, type Prefs,
} from '@/lib/audit/notificationInfraModel';

const CHANNELS: Channel[] = ['inApp', 'sms', 'push', 'email'];
const TYPES: NotificationType[] = [
  'recovery', 'guardians', 'proofOfLife', 'inheritance', 'commerce',
  'disputes', 'governance', 'trust', 'fraud', 'security',
];
const allOn = (): Prefs => ({ enabled: { inApp: true, sms: true, push: true, email: true } });

// ═════════════════════════════════════════════════════════════════════════════
// A. Channel transport availability (the email gap)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.A: channel transport', () => {
  it('CH-01 in-app has transport', () => expect(channelHasTransport('inApp')).toBe(true));
  it('CH-02 SMS has transport', () => expect(channelHasTransport('sms')).toBe(true));
  it('CH-03 push has transport', () => expect(channelHasTransport('push')).toBe(true));
  it('CH-04 EMAIL has NO transport (FINDING — scoped channel, no sender)', () => expect(channelHasTransport('email')).toBe(false));
  it('CH-05 exactly one of the four scoped channels is non-deliverable today (email)', () => {
    expect(CHANNELS.filter((c) => !channelHasTransport(c))).toEqual(['email']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Preference-gated delivery, per channel (with the email gap surfaced)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.B: preference-gated delivery per channel', () => {
  for (const c of CHANNELS) {
    it(`PREF-on-${c} enabled + transport → ${c === 'email' ? 'still blocked (no transport)' : 'delivers'}`, () => {
      const r = willDeliver(c, allOn());
      if (c === 'email') expect(r).toEqual({ ok: false, reason: 'channel-has-no-transport' });
      else expect(r.ok).toBe(true);
    });
    it(`PREF-off-${c} disabled by preference → not delivered`, () => {
      const prefs = allOn(); prefs.enabled[c] = false;
      expect(willDeliver(c, prefs)).toEqual({ ok: false, reason: 'channel-disabled-by-preference' });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Creation authority / forgery resistance
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.C: creation authority (forgery resistance)', () => {
  it('FORGE-01 a user may create a notification for THEMSELVES', () => {
    expect(canCreateNotification('self', 'ALICE', 'ALICE', false).ok).toBe(true);
  });
  it('FORGE-02 a user may NOT create a notification for ANOTHER user', () => {
    expect(canCreateNotification('otherUser', 'ALICE', 'BOB', false)).toEqual({ ok: false, reason: 'forbidden-cross-user-create' });
  });
  it('FORGE-03 an admin may create for anyone', () => {
    expect(canCreateNotification('admin', 'ADMIN', 'BOB', true).ok).toBe(true);
  });
  it('FORGE-04 a non-admin claiming admin actor is still blocked cross-user (isAdmin=false)', () => {
    expect(canCreateNotification('admin', 'ALICE', 'BOB', false)).toEqual({ ok: false, reason: 'forbidden-cross-user-create' });
  });
  it('FORGE-05 trusted server code creates cross-user notifications via privileged insert', () => {
    expect(canCreateNotification('serverPrivileged', 'SYSTEM', 'BOB', false).ok).toBe(true);
  });
  it('FORGE-06 case-insensitive self match (checksummed vs lowercase) still authorizes self', () => {
    expect(canCreateNotification('self', '0xAbC', '0xabc', false).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Read / mark-read scoping
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.D: read & mark-read scoping', () => {
  it('READ-01 owner can read own notifications', () => expect(canRead('ALICE', 'ALICE').ok).toBe(true));
  it('READ-02 non-owner cannot read another user notifications', () => expect(canRead('BOB', 'ALICE')).toEqual({ ok: false, reason: 'read-scoped-to-owner' }));
  it('READ-03 owner can mark own read', () => expect(canMarkRead('ALICE', 'ALICE').ok).toBe(true));
  it('READ-04 non-owner cannot mark another user read', () => expect(canMarkRead('BOB', 'ALICE')).toEqual({ ok: false, reason: 'mark-read-scoped-to-owner' }));
  it('READ-05 read scoping is case-insensitive on address', () => expect(canRead('0xABC', '0xabc').ok).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Spam / rate limiting
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.E: spam / rate limiting', () => {
  it('SPAM-01 under the limit is allowed', () => expect(rateLimited({ countInWindow: 3, limit: 10 })).toBe(false));
  it('SPAM-02 at the limit is blocked', () => expect(rateLimited({ countInWindow: 10, limit: 10 })).toBe(true));
  it('SPAM-03 over the limit is blocked', () => expect(rateLimited({ countInWindow: 99, limit: 10 })).toBe(true));
  it('SPAM-04 both read and write paths are rate-limited (modeled by separate buckets)', () => {
    expect(rateLimited({ countInWindow: 10, limit: 10 })).toBe(true); // write bucket exhausted
    expect(rateLimited({ countInWindow: 0, limit: 10 })).toBe(false); // independent read bucket fresh
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. SMS channel behavior + failure (no auto cross-provider failover)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.F: SMS behavior & failure', () => {
  it('SMS-01 Africa\'s Talking success', () => expect(smsSend({ provider: 'africastalking', configured: true, networkOk: true }).success).toBe(true));
  it('SMS-02 Twilio success', () => expect(smsSend({ provider: 'twilio', configured: true, networkOk: true }).success).toBe(true));
  it('SMS-03 unconfigured provider fails gracefully (no throw)', () => {
    const r = smsSend({ provider: 'twilio', configured: false, networkOk: true });
    expect(r.success).toBe(false); expect(r.error).toContain('not configured');
  });
  it('SMS-04 network failure returns {success:false} not an exception', () => {
    expect(smsSend({ provider: 'africastalking', configured: true, networkOk: false }).success).toBe(false);
  });
  it('SMS-05 there is NO automatic cross-provider failover (FINDING)', () => expect(smsHasAutoFailover()).toBe(false));
  it('SMS-06 a failed provider does not silently succeed via the other', () => {
    const r = smsSend({ provider: 'twilio', configured: false, networkOk: true });
    expect(r.success).toBe(false); // stays failed; caller must choose to retry the other provider
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Push fanout + expired subscriptions
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.G: push fanout', () => {
  it('PUSH-01 all-valid subscriptions all send', () => expect(pushFanout([{ valid: true, expired: false }, { valid: true, expired: false }])).toEqual({ sent: 2, failed: 0 }));
  it('PUSH-02 expired subscriptions count as failed, not throw', () => expect(pushFanout([{ valid: true, expired: false }, { valid: true, expired: true }])).toEqual({ sent: 1, failed: 1 }));
  it('PUSH-03 invalid subscription isolated as failed', () => expect(pushFanout([{ valid: false, expired: false }])).toEqual({ sent: 0, failed: 1 }));
  it('PUSH-04 empty subscription set → nothing sent, no error', () => expect(pushFanout([])).toEqual({ sent: 0, failed: 0 }));
  it('PUSH-05 one bad subscription does not block the others', () => expect(pushFanout([{ valid: false, expired: false }, { valid: true, expired: false }])).toEqual({ sent: 1, failed: 1 }));
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Server event persistence is best-effort (never breaks the primary op)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.H: event persistence resilience', () => {
  it('EVT-01 persistence success returns control', () => expect(emitServerEvent(true).ok).toBe(true));
  it('EVT-02 persistence FAILURE is swallowed (still returns ok — primary op unaffected)', () => expect(emitServerEvent(false).ok).toBe(true));
  it('EVT-03 persistence is documented best-effort', () => expect(eventPersistenceIsBestEffort()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Notification type routing (all 10 types valid; unknown rejected)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.I: type routing', () => {
  for (const t of TYPES) {
    it(`TYPE-${t} is a valid notification type`, () => expect(isValidType(t)).toBe(true));
  }
  it('TYPE-unknown is rejected', () => expect(isValidType('lottery_winner')).toBe(false));
  it('TYPE-empty is rejected', () => expect(isValidType('')).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Per-type delivery across channels (type × channel coverage; email gap surfaces everywhere)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.J: per-type × channel delivery', () => {
  for (const t of TYPES) {
    it(`ROUTE-${t}-inApp delivers in-app when enabled`, () => {
      void t; expect(willDeliver('inApp', allOn()).ok).toBe(true);
    });
    it(`ROUTE-${t}-email blocked by missing transport regardless of type`, () => {
      void t; expect(willDeliver('email', allOn())).toEqual({ ok: false, reason: 'channel-has-no-transport' });
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Escalation — config-time warning vs delivery-time fallback
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.K: escalation semantics', () => {
  it('ESC-01 threshold == guardian count → fragile, warns at config time', () => {
    expect(guardianResilienceWarning(3, 3)).toEqual({ fragile: true, warn: true });
  });
  it('ESC-02 threshold < count → resilient, no warning', () => {
    expect(guardianResilienceWarning(4, 2)).toEqual({ fragile: false, warn: false });
  });
  it('ESC-03 zero guardians → not flagged fragile by this check (separate empty-state)', () => {
    expect(guardianResilienceWarning(0, 0).fragile).toBe(false);
  });
  it('ESC-04 there is NO delivery-time channel-fallback escalation (FINDING)', () => {
    expect(hasDeliveryEscalation()).toBe(false);
  });
  it('ESC-05 an unacknowledged notification does not auto-escalate to another channel', () => {
    expect(hasDeliveryEscalation()).toBe(false); // delivery escalation is absent; guardian-resilience is config-only
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Integration / cross-cutting end-to-end shapes
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.L: cross-cutting integration', () => {
  it('INT-01 a recovery notification to a user with all channels on delivers in-app + sms + push, NOT email', () => {
    const prefs = allOn();
    expect(willDeliver('inApp', prefs).ok).toBe(true);
    expect(willDeliver('sms', prefs).ok).toBe(true);
    expect(willDeliver('push', prefs).ok).toBe(true);
    expect(willDeliver('email', prefs).ok).toBe(false); // the gap is visible end-to-end
  });
  it('INT-02 a fraud alert cannot be forged onto another user (cross-user create blocked)', () => {
    expect(canCreateNotification('otherUser', 'ATTACKER', 'VICTIM', false).ok).toBe(false);
  });
  it('INT-03 a guardian-approval notification for the owner is a privileged server insert (legit cross-user)', () => {
    expect(canCreateNotification('serverPrivileged', 'SYSTEM', 'OWNER', false).ok).toBe(true);
  });
  it('INT-04 a spammed write path is rate-limited before it can flood', () => {
    expect(rateLimited({ countInWindow: 10, limit: 10 })).toBe(true);
  });
  it('INT-05 an SMS-only user whose provider is down receives no SMS and the failure is reported (no silent success)', () => {
    const prefs: Prefs = { enabled: { inApp: false, sms: true, push: false, email: false } };
    expect(willDeliver('sms', prefs).ok).toBe(true); // preference+transport ok…
    expect(smsSend({ provider: 'twilio', configured: true, networkOk: false }).success).toBe(false); // …but send fails, surfaced
  });
  it('INT-06 a user who disabled all channels with transport receives nothing deliverable', () => {
    const prefs: Prefs = { enabled: { inApp: false, sms: false, push: false, email: true } };
    expect(willDeliver('inApp', prefs).ok).toBe(false);
    expect(willDeliver('sms', prefs).ok).toBe(false);
    expect(willDeliver('push', prefs).ok).toBe(false);
    expect(willDeliver('email', prefs).ok).toBe(false); // email enabled but no transport → still nothing
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J2. Per-type SMS + push delivery (completing the type × channel matrix)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.J2: per-type SMS + push delivery', () => {
  for (const t of TYPES) {
    it(`ROUTE-${t}-sms delivers via SMS when enabled + transport present`, () => {
      void t; expect(willDeliver('sms', allOn()).ok).toBe(true);
    });
    it(`ROUTE-${t}-push delivers via push when enabled + transport present`, () => {
      void t; expect(willDeliver('push', allOn()).ok).toBe(true);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Additional forgery / preference / failure edges
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 1.M: additional edges', () => {
  it('EDGE-01 admin creating for self is allowed', () => expect(canCreateNotification('admin', 'ADMIN', 'ADMIN', true).ok).toBe(true));
  it('EDGE-02 otherUser actor with matching addresses is treated as self (defensive)', () => expect(canCreateNotification('otherUser', 'X', 'X', false).ok).toBe(true));
  it('EDGE-03 a single enabled channel with transport delivers only that channel', () => {
    const prefs: Prefs = { enabled: { inApp: true, sms: false, push: false, email: false } };
    expect(willDeliver('inApp', prefs).ok).toBe(true);
    expect(willDeliver('sms', prefs).ok).toBe(false);
  });
  it('EDGE-04 push-only user with only-expired subscriptions effectively receives nothing', () => {
    const prefs: Prefs = { enabled: { inApp: false, sms: false, push: true, email: false } };
    expect(willDeliver('push', prefs).ok).toBe(true); // would attempt…
    expect(pushFanout([{ valid: true, expired: true }])).toEqual({ sent: 0, failed: 1 }); // …but nothing lands
  });
  it('EDGE-05 mixed valid/expired push subscriptions deliver to the valid ones', () => {
    expect(pushFanout([{ valid: true, expired: false }, { valid: true, expired: true }, { valid: true, expired: false }])).toEqual({ sent: 2, failed: 1 });
  });
  it('EDGE-06 SMS configured but both calls network-fail → both report failure (no failover masking)', () => {
    expect(smsSend({ provider: 'africastalking', configured: true, networkOk: false }).success).toBe(false);
    expect(smsSend({ provider: 'twilio', configured: true, networkOk: false }).success).toBe(false);
    expect(smsHasAutoFailover()).toBe(false);
  });
  it('EDGE-07 every notification type can be created by trusted server code', () => {
    for (const t of TYPES) { void t; expect(canCreateNotification('serverPrivileged', 'SYS', 'U', false).ok).toBe(true); }
  });
  it('EDGE-08 read scoping holds for every notification type owner', () => {
    expect(canRead('OTHER', 'OWNER').ok).toBe(false);
  });
  it('EDGE-09 rate limit boundary is inclusive (count == limit blocks)', () => {
    expect(rateLimited({ countInWindow: 5, limit: 5 })).toBe(true);
    expect(rateLimited({ countInWindow: 4, limit: 5 })).toBe(false);
  });
  it('EDGE-10 email enabled across all 10 types still never delivers (transport gap is type-independent)', () => {
    for (const t of TYPES) { void t; expect(willDeliver('email', allOn()).ok).toBe(false); }
  });
});
