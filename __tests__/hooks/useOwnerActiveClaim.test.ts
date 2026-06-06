/**
 * useOwnerActiveClaim
 * Verifies canChallenge logic across all status states and the grace period edge case.
 *
 * Key contract rule (VaultRecoveryClaim.sol line 694):
 *   challengeClaim() allows challenge up to challengeEndsAt + FINALIZATION_GRACE_PERIOD (1 day)
 *   but the on-chain challengeTimeRemaining() view only counts down to challengeEndsAt.
 *   The hook adds 86400s grace so canChallenge stays true during that final window.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';

const STATUS = {
  None: 0,
  Pending: 1,
  GuardianApproved: 2,
  Challenged: 3,
  Approved: 4,
  Executed: 5,
  Rejected: 6,
  Expired: 7,
};

const mockUseVaultHub      = jest.fn();
const mockUseRecoveryClaim = jest.fn();

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockUseVaultHub(),
}));
jest.mock('@/hooks/useRecoveryClaim', () => ({
  useRecoveryClaim: (_args: any) => mockUseRecoveryClaim(),
  RecoveryClaimStatus: STATUS,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useOwnerActiveClaim } = require('../../hooks/useOwnerActiveClaim');

function makeClaim(status: number) {
  return {
    claimId: 1n,
    originalOwner: '0xOwner',
    claimant: '0xClaimant',
    initiator: '0xClaimant',
    status,
  };
}

function setupMocks(status: number, onChainTimeRemaining: bigint) {
  mockUseVaultHub.mockReturnValue({ vaultAddress: '0xVault', hasVault: true });
  mockUseRecoveryClaim.mockReturnValue({
    hasClaim: true,
    claimId: 1n,
    claim: makeClaim(status),
    challengeTimeRemaining: onChainTimeRemaining,
  });
}

describe('useOwnerActiveClaim — canChallenge', () => {
  beforeEach(() => {
    mockUseVaultHub.mockReset();
    mockUseRecoveryClaim.mockReset();
  });

  // ── Challengeable states with time remaining ───────────────────────────────

  it('canChallenge=true for Pending with on-chain time remaining', () => {
    setupMocks(STATUS.Pending, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(true);
    expect(result.current.hasActiveClaim).toBe(true);
  });

  it('canChallenge=true for GuardianApproved with on-chain time remaining', () => {
    setupMocks(STATUS.GuardianApproved, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(true);
  });

  it('canChallenge=true for Approved with on-chain time remaining', () => {
    setupMocks(STATUS.Approved, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(true);
  });

  // ── Grace period edge case ─────────────────────────────────────────────────

  it('canChallenge=true when on-chain time=0 but within 1-day grace period', () => {
    // The contract allows challenge up to challengeEndsAt + FINALIZATION_GRACE_PERIOD (1 day).
    // The on-chain challengeTimeRemaining() view returns 0 once challengeEndsAt passes,
    // but the hook adds 86400s so canChallenge stays true for that extra window.
    setupMocks(STATUS.GuardianApproved, 0n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(true);
    expect(result.current.challengeTimeRemaining).toBe(86400n); // grace period only
  });

  // ── Terminal states ────────────────────────────────────────────────────────

  it('canChallenge=false for Executed (terminal)', () => {
    setupMocks(STATUS.Executed, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(false);
  });

  it('canChallenge=false for Rejected (terminal)', () => {
    setupMocks(STATUS.Rejected, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(false);
  });

  it('canChallenge=false for Expired (terminal)', () => {
    setupMocks(STATUS.Expired, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(false);
  });

  it('canChallenge=false for Challenged status (defensive — contract never sets this)', () => {
    setupMocks(STATUS.Challenged, 86400n);
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(false);
  });

  // ── No claim ──────────────────────────────────────────────────────────────

  it('canChallenge=false and hasActiveClaim=false when no active claim', () => {
    mockUseVaultHub.mockReturnValue({ vaultAddress: '0xVault', hasVault: true });
    mockUseRecoveryClaim.mockReturnValue({
      hasClaim: false,
      claimId: 0n,
      claim: null,
      challengeTimeRemaining: 0n,
    });
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.canChallenge).toBe(false);
    expect(result.current.hasActiveClaim).toBe(false);
  });

  it('ownVault=undefined and hasActiveClaim=false when user has no vault', () => {
    mockUseVaultHub.mockReturnValue({ vaultAddress: undefined, hasVault: false });
    mockUseRecoveryClaim.mockReturnValue({
      hasClaim: false,
      claimId: 0n,
      claim: null,
      challengeTimeRemaining: 0n,
    });
    const { result } = renderHook(() => useOwnerActiveClaim());
    expect(result.current.ownVault).toBeUndefined();
    expect(result.current.hasActiveClaim).toBe(false);
  });
});
