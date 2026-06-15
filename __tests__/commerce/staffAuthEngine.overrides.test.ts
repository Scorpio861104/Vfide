import { describe, expect, it } from '@jest/globals';
import {
  authorizeStaffAction, canAssignRole,
  type StaffContext, type StaffPermissions, type StaffRole,
} from '@/lib/commerce/staffAuthEngine';

const NOW = 1_700_000_000_000;
const base = (role: StaffRole): StaffPermissions => ({
  admin:   { processSales: true, viewProducts: true, editProducts: true,  issueRefunds: true,  viewAnalytics: true,  maxSaleAmount: 10000, dailySaleLimit: 50000 },
  manager: { processSales: true, viewProducts: true, editProducts: true,  issueRefunds: true,  viewAnalytics: true,  maxSaleAmount: 2500,  dailySaleLimit: 10000 },
  cashier: { processSales: true, viewProducts: true, editProducts: false, issueRefunds: false, viewAnalytics: false, maxSaleAmount: 300,   dailySaleLimit: 2000 },
}[role]);
const ctx = (perms: StaffPermissions, o: Partial<StaffContext> = {}): StaffContext => ({
  active: true, expiresAtMs: NOW + 86_400_000, nowMs: NOW, permissions: perms, todaysSaleTotal: 0, ...o,
});

// ════════════════════════════════════════════════════════
// PHASE 3 — CUSTOM-PERMISSION OVERRIDE MATRIX (merchant-tuned limits on top of role presets)
//   J. Elevated cashier   K. Restricted manager   L. Mixed overrides   M. Assignment combos
// ════════════════════════════════════════════════════════

describe('Phase 3 · J. Elevated cashier (merchant grants more)', () => {
  it('J1 a cashier given issueRefunds=true can now refund', () => {
    expect(authorizeStaffAction(ctx({ ...base('cashier'), issueRefunds: true }), 'refund').ok).toBe(true);
  });
  it('J2 a cashier with a raised maxSaleAmount can sell higher', () => {
    expect(authorizeStaffAction(ctx({ ...base('cashier'), maxSaleAmount: 1000 }), 'sale', 800).ok).toBe(true);
  });
  it('J3 a cashier with a raised daily limit can accumulate more', () => {
    expect(authorizeStaffAction(ctx({ ...base('cashier'), dailySaleLimit: 5000 }, { todaysSaleTotal: 2500 }), 'sale', 300).ok).toBe(true);
  });
  it('J4 a cashier given editProducts can edit', () => {
    expect(authorizeStaffAction(ctx({ ...base('cashier'), editProducts: true }), 'product_edit').ok).toBe(true);
  });
});

describe('Phase 3 · K. Restricted manager (merchant grants less)', () => {
  it('K1 a manager with issueRefunds=false cannot refund', () => {
    expect(authorizeStaffAction(ctx({ ...base('manager'), issueRefunds: false }), 'refund').reason).toBe('NOT_PERMITTED');
  });
  it('K2 a manager with a lowered maxSaleAmount is capped tighter', () => {
    expect(authorizeStaffAction(ctx({ ...base('manager'), maxSaleAmount: 500 }), 'sale', 600).reason).toBe('OVER_MAX_SALE');
  });
  it('K3 a manager with editProducts=false cannot edit', () => {
    expect(authorizeStaffAction(ctx({ ...base('manager'), editProducts: false }), 'product_edit').reason).toBe('NOT_PERMITTED');
  });
  it('K4 a manager with viewAnalytics=false cannot view analytics', () => {
    expect(authorizeStaffAction(ctx({ ...base('manager'), viewAnalytics: false }), 'view_analytics').ok).toBe(false);
  });
});

describe('Phase 3 · L. Mixed overrides', () => {
  it('L1 elevated cap but tight daily limit still enforces the daily cap', () => {
    // maxSale 5000 (can do big single tx) but daily 1000 → a 1500 sale breaches daily
    expect(authorizeStaffAction(ctx({ ...base('cashier'), maxSaleAmount: 5000, dailySaleLimit: 1000 }), 'sale', 1500).reason).toBe('OVER_DAILY_LIMIT');
  });
  it('L2 refund granted but sales revoked: can refund, cannot sell', () => {
    const p = { ...base('cashier'), issueRefunds: true, processSales: false };
    expect(authorizeStaffAction(ctx(p), 'refund').ok).toBe(true);
    expect(authorizeStaffAction(ctx(p), 'sale', 10).reason).toBe('NOT_PERMITTED');
  });
  it('L3 an inactive elevated cashier still cannot act (session beats permission)', () => {
    expect(authorizeStaffAction(ctx({ ...base('cashier'), issueRefunds: true }, { active: false }), 'refund').reason).toBe('INACTIVE');
  });
  it('L4 a high-cap admin nearing its daily limit is still capped', () => {
    expect(authorizeStaffAction(ctx(base('admin'), { todaysSaleTotal: 49900 }), 'sale', 200).reason).toBe('OVER_DAILY_LIMIT');
  });
});

describe('Phase 3 · M. Assignment combos (escalation matrix)', () => {
  const roles: StaffRole[] = ['admin', 'manager', 'cashier'];
  it('M1 owner → every role allowed', () => roles.forEach((r) => expect(canAssignRole('owner', r)).toBe(true)));
  it('M2 admin → only non-admin', () => {
    expect(canAssignRole('admin', 'manager')).toBe(true);
    expect(canAssignRole('admin', 'cashier')).toBe(true);
    expect(canAssignRole('admin', 'admin')).toBe(false);
  });
  it('M3 manager → nothing', () => roles.forEach((r) => expect(canAssignRole('manager', r)).toBe(false)));
  it('M4 cashier → nothing', () => roles.forEach((r) => expect(canAssignRole('cashier', r)).toBe(false)));
});
