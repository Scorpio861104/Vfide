/**
 * Vault Health engine tests (Wave 85 — Ownership/Vault institution campaign).
 *
 * Locks the safety-scoring logic that was previously inline in the component (untested). Covers the
 * dimension math, grade thresholds, recommendation generation, NaN/garbage hardening, and the
 * recovery property (improving protection always improves the score — safety posture is never permanent).
 */

import { describe, expect, it } from '@jest/globals';
import { computeVaultHealth, type VaultHealthInputs } from '@/lib/vault/vaultHealth';

const base: VaultHealthInputs = {
  guardianCount: 0,
  transferLimit: 0,
  isOperational: true,
  hasVault: true,
  proofScore: 0,
};

describe('Vault Health engine (Wave 85)', () => {
  it('a brand-new vault with no protection scores low and recommends the basics', () => {
    const r = computeVaultHealth(base);
    expect(r.total).toBeLessThan(50);
    const security = r.dimensions.find((d) => d.label === 'Security');
    expect(security?.recommendations).toContain('Add guardians to protect your vault');
  });

  it('a fully-protected vault scores Excellent', () => {
    const r = computeVaultHealth({ guardianCount: 3, transferLimit: 1000, isOperational: true, hasVault: true, proofScore: 7000 });
    // Security 25 + Recovery 25 + Trust 25 + Setup 25 = 100
    expect(r.total).toBe(100);
    expect(r.grade).toBe('Excellent');
  });

  it('dimensions never exceed their max (no saturation overflow)', () => {
    const r = computeVaultHealth({ guardianCount: 99, transferLimit: 1e9, isOperational: true, hasVault: true, proofScore: 10000 });
    for (const d of r.dimensions) {
      expect(d.score).toBeLessThanOrEqual(d.maxScore);
    }
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('RECOVERY property: adding a guardian always improves the score (protection is never permanent)', () => {
    const none = computeVaultHealth({ ...base, guardianCount: 0 });
    const one = computeVaultHealth({ ...base, guardianCount: 1 });
    const three = computeVaultHealth({ ...base, guardianCount: 3 });
    expect(one.total).toBeGreaterThan(none.total);
    expect(three.total).toBeGreaterThan(one.total);
  });

  it('NaN / garbage inputs are hardened to zero, never producing NaN', () => {
    const r = computeVaultHealth({
      guardianCount: NaN,
      transferLimit: Number.POSITIVE_INFINITY,
      isOperational: true,
      hasVault: true,
      proofScore: NaN,
    });
    expect(Number.isFinite(r.total)).toBe(true);
    // NaN guardians → treated as 0 guardians → security recommends adding guardians.
    const security = r.dimensions.find((d) => d.label === 'Security');
    expect(security?.recommendations).toContain('Add guardians to protect your vault');
    // Infinity transfer limit is floored to a safe count; it must not poison the score.
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('grade thresholds map correctly across the range', () => {
    expect(computeVaultHealth({ guardianCount: 3, transferLimit: 1000, isOperational: true, hasVault: true, proofScore: 7000 }).grade).toBe('Excellent'); // 100
    expect(computeVaultHealth({ guardianCount: 2, transferLimit: 1000, isOperational: true, hasVault: true, proofScore: 5000 }).grade).toBe('Good'); // 20+20+18+25 = 83
    expect(computeVaultHealth(base).grade).toBe('At Risk'); // 0+0+5+15 = 20
  });

  it('ProofScore drives the Trust dimension in bands', () => {
    expect(computeVaultHealth({ ...base, proofScore: 7000 }).dimensions.find((d) => d.label === 'Trust')?.score).toBe(25);
    expect(computeVaultHealth({ ...base, proofScore: 5000 }).dimensions.find((d) => d.label === 'Trust')?.score).toBe(18);
    expect(computeVaultHealth({ ...base, proofScore: 3000 }).dimensions.find((d) => d.label === 'Trust')?.score).toBe(12);
    expect(computeVaultHealth({ ...base, proofScore: 0 }).dimensions.find((d) => d.label === 'Trust')?.score).toBe(5);
  });
});
