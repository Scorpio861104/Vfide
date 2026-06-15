/**
 * Identity Architecture — adversarial + edge scenario matrix (Backend Completion Campaign 2).
 *
 * Certifies all 8 identity types: enforcement layer, capability authority (create/rotate/revoke/recover/transfer),
 * staff privilege-escalation guard + action authorization, the no-escalation invariant across every identity pair,
 * and compromise / device-loss / inheritance behavior — including the auditor-not-first-class finding. Target 100+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  enforcementOf, isFirstClassEnforced, capabilityAuthority, canAssignRole, authorizeStaffAction, canEscalate,
  compromiseRaisesAuthority, deviceLossRecoverable, inheritanceTransfersIdentity,
  type Identity, type Capability, type StaffRole, type StaffCtx,
} from '@/lib/audit/identityArchitectureModel';

const IDS: Identity[] = ['owner', 'admin', 'spending', 'guardian', 'dao', 'merchant', 'staff', 'auditor'];
const STAFF_ROLES: StaffRole[] = ['admin', 'manager', 'cashier'];

// ═════════════════════════════════════════════════════════════════════════════
// A. Enforcement layer per identity (the auditor gap)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.A: enforcement layer', () => {
  it('ENF-01 owner/admin/spending/guardian/dao/merchant are on-chain enforced', () => {
    for (const id of ['owner', 'admin', 'spending', 'guardian', 'dao', 'merchant'] as Identity[]) {
      expect(enforcementOf(id)).toBe('onchain');
    }
  });
  it('ENF-02 staff is off-chain enforced (staffAuthEngine + route gate)', () => expect(enforcementOf('staff')).toBe('offchain'));
  it('ENF-03 auditor is NOMINAL — not a first-class enforced identity (FINDING I-1)', () => expect(enforcementOf('auditor')).toBe('nominal'));
  it('ENF-04 every identity except auditor is first-class enforced', () => {
    expect(IDS.filter((id) => !isFirstClassEnforced(id))).toEqual(['auditor']);
  });
  it('ENF-05 all eight identity types are accounted for', () => expect(IDS.length).toBe(8));
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Capability authority — owner / admin / spending (certified core, re-asserted)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.B: core identity capabilities', () => {
  it('CAP-owner-recover only by the guardian set', () => {
    expect(capabilityAuthority('owner', 'recover', 'guardianSet').ok).toBe(true);
    expect(capabilityAuthority('owner', 'recover', 'admin').ok).toBe(false);
  });
  it('CAP-owner-not-rotatable (owner changes only at registration/recovery)', () => {
    expect(capabilityAuthority('owner', 'rotate', 'admin').ok).toBe(false);
  });
  it('CAP-admin-transfer is onlyAdmin two-step', () => {
    expect(capabilityAuthority('admin', 'transfer', 'admin').ok).toBe(true);
    expect(capabilityAuthority('admin', 'transfer', 'spending').ok).toBe(false);
  });
  it('CAP-spending-rotate is admin-proposed (guardian-approved)', () => {
    expect(capabilityAuthority('spending', 'rotate', 'admin').ok).toBe(true);
    expect(capabilityAuthority('spending', 'rotate', 'staff').ok).toBe(false);
  });
  it('CAP-admin/spending reset via recovery only', () => {
    expect(capabilityAuthority('admin', 'recover', 'guardianSet').ok).toBe(true);
    expect(capabilityAuthority('spending', 'recover', 'guardianSet').ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Capability authority — guardian / dao / merchant
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.C: role identity capabilities', () => {
  it('CAP-guardian-create/revoke is admin-timelocked', () => {
    expect(capabilityAuthority('guardian', 'create', 'admin').ok).toBe(true);
    expect(capabilityAuthority('guardian', 'revoke', 'admin').ok).toBe(true);
    expect(capabilityAuthority('guardian', 'create', 'staff').ok).toBe(false);
  });
  it('CAP-dao-transfer is onlyDAO', () => {
    expect(capabilityAuthority('dao', 'transfer', 'dao').ok).toBe(true);
    expect(capabilityAuthority('dao', 'transfer', 'admin').ok).toBe(false);
    expect(capabilityAuthority('dao', 'transfer', 'merchant').ok).toBe(false);
  });
  it('CAP-merchant-create is self-register with min score', () => {
    expect(capabilityAuthority('merchant', 'create', 'merchantSelf').ok).toBe(true);
    expect(capabilityAuthority('merchant', 'create', 'admin').ok).toBe(false);
  });
  it('CAP-merchant-revoke is governed (DAO)', () => {
    expect(capabilityAuthority('merchant', 'revoke', 'dao').ok).toBe(true);
    expect(capabilityAuthority('merchant', 'revoke', 'merchantSelf').ok).toBe(false);
  });
  it('CAP-staff-create/revoke is owner-or-admin', () => {
    expect(capabilityAuthority('staff', 'create', 'owner').ok).toBe(true);
    expect(capabilityAuthority('staff', 'create', 'admin').ok).toBe(true);
    expect(capabilityAuthority('staff', 'create', 'merchant').ok).toBe(false);
  });
  it('CAP-auditor has no enforced create/rotate/revoke (not first-class)', () => {
    for (const cap of ['create', 'rotate', 'revoke', 'recover', 'transfer'] as Capability[]) {
      expect(capabilityAuthority('auditor', cap, 'dao').ok).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Staff privilege-escalation guard (canAssignRole)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.D: staff escalation guard', () => {
  it('ASSIGN-01 owner may assign any staff role', () => {
    for (const r of STAFF_ROLES) expect(canAssignRole('owner', r)).toBe(true);
  });
  it('ASSIGN-02 admin may assign manager/cashier but NOT another admin', () => {
    expect(canAssignRole('admin', 'manager')).toBe(true);
    expect(canAssignRole('admin', 'cashier')).toBe(true);
    expect(canAssignRole('admin', 'admin')).toBe(false);
  });
  it('ASSIGN-03 manager cannot assign any role', () => {
    for (const r of STAFF_ROLES) expect(canAssignRole('manager', r)).toBe(false);
  });
  it('ASSIGN-04 cashier cannot assign any role (no self-promotion)', () => {
    for (const r of STAFF_ROLES) expect(canAssignRole('cashier', r)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Staff action authorization (session + permissions + caps)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.E: staff action authorization', () => {
  const base = (o: Partial<StaffCtx['perms']> = {}, c: Partial<StaffCtx> = {}): StaffCtx => ({
    active: true, expired: false,
    perms: { processSales: true, issueRefunds: false, editProducts: false, viewAnalytics: false, maxSale: 100, dailyLimit: 500, ...o },
    todaysTotal: 0, ...c,
  });
  it('STAFF-01 inactive session is denied', () => expect(authorizeStaffAction(base({}, { active: false }), 'sale', 10)).toEqual({ ok: false, reason: 'INACTIVE' }));
  it('STAFF-02 expired session is denied', () => expect(authorizeStaffAction(base({}, { expired: true }), 'sale', 10)).toEqual({ ok: false, reason: 'EXPIRED' }));
  it('STAFF-03 sale within caps is allowed', () => expect(authorizeStaffAction(base(), 'sale', 50).ok).toBe(true));
  it('STAFF-04 sale over per-tx cap denied', () => expect(authorizeStaffAction(base(), 'sale', 150)).toEqual({ ok: false, reason: 'OVER_MAX_SALE' }));
  it('STAFF-05 sale over daily cap denied', () => expect(authorizeStaffAction(base({}, { todaysTotal: 480 }), 'sale', 50)).toEqual({ ok: false, reason: 'OVER_DAILY_LIMIT' }));
  it('STAFF-06 sale without processSales permission denied', () => expect(authorizeStaffAction(base({ processSales: false }), 'sale', 10)).toEqual({ ok: false, reason: 'NOT_PERMITTED' }));
  it('STAFF-07 refund without issueRefunds denied', () => expect(authorizeStaffAction(base(), 'refund')).toEqual({ ok: false, reason: 'NOT_PERMITTED' }));
  it('STAFF-08 refund with permission allowed', () => expect(authorizeStaffAction(base({ issueRefunds: true }), 'refund').ok).toBe(true));
  it('STAFF-09 product_edit gated by editProducts', () => {
    expect(authorizeStaffAction(base(), 'product_edit').ok).toBe(false);
    expect(authorizeStaffAction(base({ editProducts: true }), 'product_edit').ok).toBe(true);
  });
  it('STAFF-10 view_analytics gated by viewAnalytics', () => {
    expect(authorizeStaffAction(base(), 'view_analytics').ok).toBe(false);
    expect(authorizeStaffAction(base({ viewAnalytics: true }), 'view_analytics').ok).toBe(true);
  });
  it('STAFF-11 negative sale amount rejected', () => expect(authorizeStaffAction(base(), 'sale', -5)).toEqual({ ok: false, reason: 'INVALID_AMOUNT' }));
  it('STAFF-12 sale exactly at per-tx cap allowed', () => expect(authorizeStaffAction(base(), 'sale', 100).ok).toBe(true));
  it('STAFF-13 sale that exactly hits daily cap allowed', () => expect(authorizeStaffAction(base({}, { todaysTotal: 400 }), 'sale', 100).ok).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// F. No-escalation across EVERY identity pair
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.F: no cross-identity escalation', () => {
  it('ESC-01 no distinct identity pair permits unilateral escalation', () => {
    for (const a of IDS) for (const b of IDS) {
      if (a !== b) expect(canEscalate(a, b)).toBe(false);
    }
  });
  it('ESC-02 staff cannot acquire admin/owner/dao', () => {
    expect(canEscalate('staff', 'admin')).toBe(false);
    expect(canEscalate('staff', 'owner')).toBe(false);
    expect(canEscalate('staff', 'dao')).toBe(false);
  });
  it('ESC-03 merchant cannot acquire dao or guardian', () => {
    expect(canEscalate('merchant', 'dao')).toBe(false);
    expect(canEscalate('merchant', 'guardian')).toBe(false);
  });
  it('ESC-04 spending key cannot acquire admin or owner', () => {
    expect(canEscalate('spending', 'admin')).toBe(false);
    expect(canEscalate('spending', 'owner')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Compromise / device-loss / inheritance, per identity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.G: compromise / device-loss / inheritance', () => {
  for (const id of IDS) {
    it(`COMP-${id} a compromise of ${id} does not instantly raise authority`, () => {
      expect(compromiseRaisesAuthority(id)).toBe(false);
    });
  }
  it('DEVICE-01 on-chain identities are recoverable after device loss; staff are re-issued by the merchant', () => {
    expect(deviceLossRecoverable('owner')).toBe(true);
    expect(deviceLossRecoverable('spending')).toBe(true);
    expect(deviceLossRecoverable('guardian')).toBe(true);
    expect(deviceLossRecoverable('staff')).toBe(false); // not "recovered" — re-issued
  });
  it('DEVICE-02 auditor (nominal) has no device-loss recovery path', () => expect(deviceLossRecoverable('auditor')).toBe(false));
  it('INHERIT-01 inheritance transfers ASSETS to heirs, not operational roles', () => {
    for (const id of IDS) expect(inheritanceTransfersIdentity(id)).toBe(false);
  });
  it('INHERIT-02 an heir does NOT inherit the deceased admin/guardian/merchant/staff roles automatically', () => {
    expect(inheritanceTransfersIdentity('admin')).toBe(false);
    expect(inheritanceTransfersIdentity('guardian')).toBe(false);
    expect(inheritanceTransfersIdentity('merchant')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Per-identity capability sweep (create/rotate/revoke/recover/transfer coverage)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.H: per-identity capability sweep', () => {
  for (const id of IDS) {
    it(`SWEEP-${id} an unauthorized actor (staff) cannot perform privileged capabilities`, () => {
      for (const cap of ['create', 'rotate', 'revoke', 'transfer'] as Capability[]) {
        // staff is never the authorized actor for these identity-level capabilities (except its own create by owner/admin)
        const r = capabilityAuthority(id, cap, 'staff');
        expect(r.ok).toBe(false);
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Positive capability-authority cases (the authorized actor succeeds)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.I: authorized-actor positive cases', () => {
  it('POS-01 guardianSet recovers owner/admin/spending', () => {
    expect(capabilityAuthority('owner', 'recover', 'guardianSet').ok).toBe(true);
    expect(capabilityAuthority('admin', 'recover', 'guardianSet').ok).toBe(true);
    expect(capabilityAuthority('spending', 'recover', 'guardianSet').ok).toBe(true);
  });
  it('POS-02 admin transfers admin; admin rotates spending; admin manages guardians', () => {
    expect(capabilityAuthority('admin', 'transfer', 'admin').ok).toBe(true);
    expect(capabilityAuthority('spending', 'rotate', 'admin').ok).toBe(true);
    expect(capabilityAuthority('guardian', 'create', 'admin').ok).toBe(true);
    expect(capabilityAuthority('guardian', 'revoke', 'admin').ok).toBe(true);
  });
  it('POS-03 dao transfers dao; merchant self-registers; dao revokes merchant', () => {
    expect(capabilityAuthority('dao', 'transfer', 'dao').ok).toBe(true);
    expect(capabilityAuthority('merchant', 'create', 'merchantSelf').ok).toBe(true);
    expect(capabilityAuthority('merchant', 'revoke', 'dao').ok).toBe(true);
  });
  it('POS-04 owner and admin both manage staff', () => {
    expect(capabilityAuthority('staff', 'create', 'owner').ok).toBe(true);
    expect(capabilityAuthority('staff', 'revoke', 'owner').ok).toBe(true);
    expect(capabilityAuthority('staff', 'create', 'admin').ok).toBe(true);
  });
  it('POS-05 owner self-registration creates the owner identity', () => {
    expect(capabilityAuthority('owner', 'create', 'self').ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Staff permission matrix — each permission independently gates its action
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.J: staff permission independence', () => {
  const mk = (perm: Partial<StaffCtx['perms']>): StaffCtx => ({
    active: true, expired: false,
    perms: { processSales: false, issueRefunds: false, editProducts: false, viewAnalytics: false, maxSale: 100, dailyLimit: 500, ...perm },
    todaysTotal: 0,
  });
  it('PERM-01 only processSales enables sale', () => {
    expect(authorizeStaffAction(mk({ processSales: true }), 'sale', 10).ok).toBe(true);
    expect(authorizeStaffAction(mk({ processSales: true }), 'refund').ok).toBe(false);
  });
  it('PERM-02 only issueRefunds enables refund', () => {
    expect(authorizeStaffAction(mk({ issueRefunds: true }), 'refund').ok).toBe(true);
    expect(authorizeStaffAction(mk({ issueRefunds: true }), 'sale', 10).ok).toBe(false);
  });
  it('PERM-03 only editProducts enables product_edit', () => {
    expect(authorizeStaffAction(mk({ editProducts: true }), 'product_edit').ok).toBe(true);
    expect(authorizeStaffAction(mk({ editProducts: true }), 'view_analytics').ok).toBe(false);
  });
  it('PERM-04 only viewAnalytics enables view_analytics', () => {
    expect(authorizeStaffAction(mk({ viewAnalytics: true }), 'view_analytics').ok).toBe(true);
    expect(authorizeStaffAction(mk({ viewAnalytics: true }), 'product_edit').ok).toBe(false);
  });
  it('PERM-05 no permissions → every action denied', () => {
    expect(authorizeStaffAction(mk({}), 'sale', 10).ok).toBe(false);
    expect(authorizeStaffAction(mk({}), 'refund').ok).toBe(false);
    expect(authorizeStaffAction(mk({}), 'product_edit').ok).toBe(false);
    expect(authorizeStaffAction(mk({}), 'view_analytics').ok).toBe(false);
  });
  it('PERM-06 full permissions → all actions allowed within caps', () => {
    const full = mk({ processSales: true, issueRefunds: true, editProducts: true, viewAnalytics: true });
    expect(authorizeStaffAction(full, 'sale', 10).ok).toBe(true);
    expect(authorizeStaffAction(full, 'refund').ok).toBe(true);
    expect(authorizeStaffAction(full, 'product_edit').ok).toBe(true);
    expect(authorizeStaffAction(full, 'view_analytics').ok).toBe(true);
  });
  it('PERM-07 caps still bind even with processSales', () => {
    expect(authorizeStaffAction(mk({ processSales: true, maxSale: 20 }), 'sale', 50).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Identity inheritance — heirs receive new identities, not inherited roles
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.K: identity inheritance semantics', () => {
  it('IH-01 no identity type auto-transfers on inheritance', () => {
    for (const id of IDS) expect(inheritanceTransfersIdentity(id)).toBe(false);
  });
  it('IH-02 an heir who later registers gets a fresh owner identity (self-create), not the deceased owner', () => {
    expect(capabilityAuthority('owner', 'create', 'self').ok).toBe(true);
    expect(inheritanceTransfersIdentity('owner')).toBe(false);
  });
  it('IH-03 the deceased admin/guardian/dao roles do not pass to an heir', () => {
    expect(inheritanceTransfersIdentity('admin')).toBe(false);
    expect(inheritanceTransfersIdentity('guardian')).toBe(false);
    expect(inheritanceTransfersIdentity('dao')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Concrete cross-identity boundary scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.L: concrete cross-identity boundaries', () => {
  it('XID-01 a merchant\'s staff cannot perform owner/admin vault capabilities', () => {
    expect(capabilityAuthority('admin', 'transfer', 'staff').ok).toBe(false);
    expect(capabilityAuthority('owner', 'recover', 'staff').ok).toBe(false);
  });
  it('XID-02 a guardian cannot rotate the spending key (only admin proposes; guardians approve)', () => {
    expect(capabilityAuthority('spending', 'rotate', 'guardian').ok).toBe(false);
  });
  it('XID-03 a merchant cannot grant itself dao authority', () => {
    expect(capabilityAuthority('dao', 'transfer', 'merchant').ok).toBe(false);
    expect(canEscalate('merchant', 'dao')).toBe(false);
  });
  it('XID-04 a cashier cannot promote itself to manager or admin', () => {
    expect(canAssignRole('cashier', 'manager')).toBe(false);
    expect(canAssignRole('cashier', 'admin')).toBe(false);
  });
  it('XID-05 an admin (staff) cannot mint a second staff-admin', () => {
    expect(canAssignRole('admin', 'admin')).toBe(false);
  });
  it('XID-06 the auditor identity cannot be used to perform any privileged identity capability', () => {
    expect(capabilityAuthority('auditor', 'transfer', 'auditor').ok).toBe(false);
    expect(canEscalate('auditor', 'owner')).toBe(false);
  });
  it('XID-07 dao authority is required to revoke a merchant — a merchant cannot deregister a rival', () => {
    expect(capabilityAuthority('merchant', 'revoke', 'merchantSelf').ok).toBe(false);
    expect(capabilityAuthority('merchant', 'revoke', 'dao').ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Device-loss recovery sweep per identity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.M: device-loss recovery per identity', () => {
  for (const id of IDS) {
    it(`DL-${id} recovery path matches enforcement layer`, () => {
      const expected = enforcementOf(id) === 'onchain';
      expect(deviceLossRecoverable(id)).toBe(expected);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Additional wrong-actor rejections + edges (coverage completion)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.N: wrong-actor rejections & edges', () => {
  it('WRONG-01 admin transfer rejects guardian/dao/merchant/staff actors', () => {
    for (const a of ['guardian', 'dao', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('admin', 'transfer', a).ok).toBe(false);
    }
  });
  it('WRONG-02 spending rotate rejects everyone but admin', () => {
    for (const a of ['owner', 'guardian', 'dao', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('spending', 'rotate', a).ok).toBe(false);
    }
  });
  it('WRONG-03 guardian create rejects everyone but admin', () => {
    for (const a of ['owner', 'spending', 'dao', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('guardian', 'create', a).ok).toBe(false);
    }
  });
  it('WRONG-04 dao transfer rejects everyone but dao', () => {
    for (const a of ['owner', 'admin', 'spending', 'guardian', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('dao', 'transfer', a).ok).toBe(false);
    }
  });
  it('WRONG-05 merchant revoke rejects everyone but dao', () => {
    for (const a of ['owner', 'admin', 'spending', 'guardian', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('merchant', 'revoke', a).ok).toBe(false);
    }
  });
  it('WRONG-06 staff create rejects non-owner/non-admin actors', () => {
    for (const a of ['spending', 'guardian', 'dao', 'merchant', 'staff'] as Identity[]) {
      expect(capabilityAuthority('staff', 'create', a).ok).toBe(false);
    }
  });
  it('EDGE-01 staff sale at zero amount with processSales is allowed', () => {
    const ctx: StaffCtx = { active: true, expired: false, perms: { processSales: true, issueRefunds: false, editProducts: false, viewAnalytics: false, maxSale: 100, dailyLimit: 500 }, todaysTotal: 0 };
    expect(authorizeStaffAction(ctx, 'sale', 0).ok).toBe(true);
  });
  it('EDGE-02 staff daily total already at limit blocks any further positive sale', () => {
    const ctx: StaffCtx = { active: true, expired: false, perms: { processSales: true, issueRefunds: false, editProducts: false, viewAnalytics: false, maxSale: 100, dailyLimit: 500 }, todaysTotal: 500 };
    expect(authorizeStaffAction(ctx, 'sale', 1)).toEqual({ ok: false, reason: 'OVER_DAILY_LIMIT' });
  });
  it('EDGE-03 inactive AND expired session reports inactive first', () => {
    const ctx: StaffCtx = { active: false, expired: true, perms: { processSales: true, issueRefunds: false, editProducts: false, viewAnalytics: false, maxSale: 100, dailyLimit: 500 }, todaysTotal: 0 };
    expect(authorizeStaffAction(ctx, 'sale', 10)).toEqual({ ok: false, reason: 'INACTIVE' });
  });
  it('EDGE-04 owner can assign cashier even though admin-staff cannot assign admin', () => {
    expect(canAssignRole('owner', 'cashier')).toBe(true);
    expect(canAssignRole('admin', 'admin')).toBe(false);
  });
  it('EDGE-05 every nominal-identity capability is uniformly rejected', () => {
    for (const cap of ['create', 'rotate', 'revoke', 'recover', 'transfer'] as Capability[]) {
      for (const a of IDS) expect(capabilityAuthority('auditor', cap, a).ok).toBe(false);
    }
  });
  it('EDGE-06 self-escalation is the only "true" canEscalate (identity holds itself)', () => {
    for (const id of IDS) expect(canEscalate(id, id)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Whole-surface invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 2.O: whole-surface invariants', () => {
  it('SURF-01 enforcement is defined for every one of the 8 identities', () => {
    for (const id of IDS) expect(['onchain', 'offchain', 'nominal']).toContain(enforcementOf(id));
  });
  it('SURF-02 exactly six identities are on-chain enforced', () => {
    expect(IDS.filter((id) => enforcementOf(id) === 'onchain').length).toBe(6);
  });
  it('SURF-03 no compromise of any identity raises authority (whole surface)', () => {
    for (const id of IDS) expect(compromiseRaisesAuthority(id)).toBe(false);
  });
  it('SURF-04 all 56 distinct ordered identity pairs are non-escalating', () => {
    let pairs = 0;
    for (const a of IDS) for (const b of IDS) if (a !== b) { expect(canEscalate(a, b)).toBe(false); pairs++; }
    expect(pairs).toBe(56);
  });
});
