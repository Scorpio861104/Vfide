import { describe, expect, it } from '@jest/globals';
import {
  authorizeStaffAction, canAssignRole,
  type StaffContext, type StaffPermissions, type StaffRole,
} from '@/lib/commerce/staffAuthEngine';

const NOW = 1_700_000_000_000;

// role presets mirrored from lib/merchantStaff.ts
const PERMS: Record<StaffRole, StaffPermissions> = {
  admin:   { processSales: true, viewProducts: true, editProducts: true,  issueRefunds: true,  viewAnalytics: true,  maxSaleAmount: 10000, dailySaleLimit: 50000 },
  manager: { processSales: true, viewProducts: true, editProducts: true,  issueRefunds: true,  viewAnalytics: true,  maxSaleAmount: 2500,  dailySaleLimit: 10000 },
  cashier: { processSales: true, viewProducts: true, editProducts: false, issueRefunds: false, viewAnalytics: false, maxSaleAmount: 300,   dailySaleLimit: 2000 },
};
const ctx = (role: StaffRole, o: Partial<StaffContext> = {}): StaffContext => ({
  active: true, expiresAtMs: NOW + 86_400_000, nowMs: NOW, permissions: PERMS[role], todaysSaleTotal: 0, ...o,
});

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 3 — STAFF AUTHORIZATION SCENARIO MATRIX
//   A. Session validity   B. Permission gating per action   C. Per-transaction cap
//   D. Cumulative daily limit   E. Role-assignment (privilege escalation)   F. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 3 · A. Session validity', () => {
  it('A1 inactive staff cannot act', () => expect(authorizeStaffAction(ctx('admin', { active: false }), 'sale', 100)).toEqual({ ok: false, reason: 'INACTIVE' }));
  it('A2 expired session cannot act', () => expect(authorizeStaffAction(ctx('admin', { expiresAtMs: NOW - 1 }), 'sale', 100).reason).toBe('EXPIRED'));
  it('A3 active + unexpired can act', () => expect(authorizeStaffAction(ctx('admin'), 'sale', 100).ok).toBe(true));
  it('A4 null expiry never expires', () => expect(authorizeStaffAction(ctx('admin', { expiresAtMs: null }), 'sale', 100).ok).toBe(true));
});

describe('Phase 3 · B. Permission gating per action', () => {
  it('B1 cashier cannot edit products', () => expect(authorizeStaffAction(ctx('cashier'), 'product_edit')).toEqual({ ok: false, reason: 'NOT_PERMITTED' }));
  it('B2 cashier cannot issue refunds', () => expect(authorizeStaffAction(ctx('cashier'), 'refund')).toEqual({ ok: false, reason: 'NOT_PERMITTED' }));
  it('B3 cashier cannot view analytics', () => expect(authorizeStaffAction(ctx('cashier'), 'view_analytics').ok).toBe(false));
  it('B4 cashier CAN process sales (within cap)', () => expect(authorizeStaffAction(ctx('cashier'), 'sale', 100).ok).toBe(true));
  it('B5 manager can edit products + refund', () => {
    expect(authorizeStaffAction(ctx('manager'), 'product_edit').ok).toBe(true);
    expect(authorizeStaffAction(ctx('manager'), 'refund').ok).toBe(true);
  });
  it('B6 admin can do everything', () => {
    expect(authorizeStaffAction(ctx('admin'), 'product_edit').ok).toBe(true);
    expect(authorizeStaffAction(ctx('admin'), 'refund').ok).toBe(true);
    expect(authorizeStaffAction(ctx('admin'), 'view_analytics').ok).toBe(true);
  });
  it('B7 a staff with processSales=false cannot sell', () => {
    expect(authorizeStaffAction(ctx('cashier', { permissions: { ...PERMS.cashier, processSales: false } }), 'sale', 10).reason).toBe('NOT_PERMITTED');
  });
});

describe('Phase 3 · C. Per-transaction cap (maxSaleAmount)', () => {
  it('C1 cashier sale at the cap is allowed', () => expect(authorizeStaffAction(ctx('cashier'), 'sale', 300).ok).toBe(true));
  it('C2 cashier sale over the cap is blocked', () => expect(authorizeStaffAction(ctx('cashier'), 'sale', 301)).toEqual({ ok: false, reason: 'OVER_MAX_SALE' }));
  it('C3 manager cap higher than cashier', () => {
    expect(authorizeStaffAction(ctx('manager'), 'sale', 2500).ok).toBe(true);
    expect(authorizeStaffAction(ctx('manager'), 'sale', 2501).reason).toBe('OVER_MAX_SALE');
  });
  it('C4 admin large sale within cap', () => expect(authorizeStaffAction(ctx('admin'), 'sale', 10000).ok).toBe(true));
});

describe('Phase 3 · D. Cumulative daily limit (dailySaleLimit)', () => {
  it('D1 a sale that keeps total under the daily limit is allowed', () => {
    expect(authorizeStaffAction(ctx('cashier', { todaysSaleTotal: 1500 }), 'sale', 300)).toEqual({ ok: true, newDailyTotal: 1800 });
  });
  it('D2 a sale that would exceed the daily limit is blocked', () => {
    // cashier daily 2000; already 1900; +300 = 2200 > 2000
    expect(authorizeStaffAction(ctx('cashier', { todaysSaleTotal: 1900 }), 'sale', 300)).toEqual({ ok: false, reason: 'OVER_DAILY_LIMIT' });
  });
  it('D3 a sale hitting exactly the daily limit is allowed', () => {
    expect(authorizeStaffAction(ctx('cashier', { todaysSaleTotal: 1700 }), 'sale', 300).ok).toBe(true);
  });
  it('D4 daily limit enforced even when each sale is under the per-tx cap', () => {
    // many small sales add up: at 1950, a 100 sale is under maxSale(300) but breaches daily(2000)
    expect(authorizeStaffAction(ctx('cashier', { todaysSaleTotal: 1950 }), 'sale', 100).reason).toBe('OVER_DAILY_LIMIT');
  });
});

describe('Phase 3 · E. Role-assignment (privilege escalation guard)', () => {
  it('E1 owner can assign any role', () => {
    expect(canAssignRole('owner', 'admin')).toBe(true);
    expect(canAssignRole('owner', 'manager')).toBe(true);
  });
  it('E2 admin can create managers and cashiers', () => {
    expect(canAssignRole('admin', 'manager')).toBe(true);
    expect(canAssignRole('admin', 'cashier')).toBe(true);
  });
  it('E3 admin CANNOT mint another admin (no lateral escalation)', () => expect(canAssignRole('admin', 'admin')).toBe(false));
  it('E4 manager cannot assign any role', () => {
    expect(canAssignRole('manager', 'cashier')).toBe(false);
    expect(canAssignRole('manager', 'manager')).toBe(false);
  });
  it('E5 cashier cannot assign any role', () => expect(canAssignRole('cashier', 'cashier')).toBe(false));
});

describe('Phase 3 · F. Adversarial', () => {
  it('F1 negative sale amount rejected', () => expect(authorizeStaffAction(ctx('admin'), 'sale', -100).reason).toBe('INVALID_AMOUNT'));
  it('F2 NaN amount rejected', () => expect(authorizeStaffAction(ctx('admin'), 'sale', NaN).reason).toBe('INVALID_AMOUNT'));
  it('F3 a cashier cannot refund even with a zero amount', () => expect(authorizeStaffAction(ctx('cashier'), 'refund', 0).ok).toBe(false));
  it('F4 inactive overrides permission (no action while inactive)', () => {
    expect(authorizeStaffAction(ctx('admin', { active: false }), 'product_edit').reason).toBe('INACTIVE');
  });
  it('F5 expired overrides permission', () => {
    expect(authorizeStaffAction(ctx('manager', { expiresAtMs: NOW - 1 }), 'refund').reason).toBe('EXPIRED');
  });
  it('F6 a tampered permission of maxSaleAmount 0 blocks all sales', () => {
    expect(authorizeStaffAction(ctx('cashier', { permissions: { ...PERMS.cashier, maxSaleAmount: 0 } }), 'sale', 1).reason).toBe('OVER_MAX_SALE');
  });
  it('F7 daily limit 0 blocks sales regardless of per-tx cap', () => {
    expect(authorizeStaffAction(ctx('cashier', { permissions: { ...PERMS.cashier, dailySaleLimit: 0 } }), 'sale', 1).reason).toBe('OVER_DAILY_LIMIT');
  });
  it('F8 escalation: a cashier-context cannot grant itself refund by claiming a different action shape', () => {
    // unknown action kind is denied by default (typed, but defensive)
    // @ts-expect-error testing an out-of-enum kind
    expect(authorizeStaffAction(ctx('cashier'), 'delete_everything', 0).ok).toBe(false);
  });
});
