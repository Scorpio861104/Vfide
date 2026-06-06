/**
 * useChallengePeriodPreview
 * Verifies that the hook returns the correct effective challenge period based on:
 *   - guardianSetupComplete (VaultHub)
 *   - vaultLastActivity (VaultRecoveryClaim)
 *   - user challengePeriodPreferenceView (vault)
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';

const SEVEN_DAYS_S    = 7 * 24 * 3600;
const FOURTEEN_DAYS_S = 14 * 24 * 3600;

const mockUseReadContracts = jest.fn();

jest.mock('wagmi', () => ({
  useReadContracts: (...args: any[]) => mockUseReadContracts(...args),
}));
jest.mock('@/lib/contracts', () => ({
  ACTIVE_VAULT_ABI: [],
  CONTRACT_ADDRESSES: {
    VaultRecoveryClaim: '0xRecovery',
    VaultHub: '0xVaultHub',
  },
  isConfiguredContractAddress: () => true,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
}));
jest.mock('@/lib/abis/VaultHub.json',          () => [], { virtual: true });
jest.mock('@/lib/abis/VaultRecoveryClaim.json', () => [], { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useChallengePeriodPreview } = require('../../hooks/useChallengePeriodPreview');

const NOW_S = Math.floor(Date.now() / 1000);

describe('useChallengePeriodPreview', () => {
  beforeEach(() => { mockUseReadContracts.mockReset(); });

  it('returns 14-day extended period when guardianSetupComplete is false', () => {
    mockUseReadContracts.mockReturnValue({
      data: [
        { result: 0n },                 // no user preference
        { result: 0n },                 // no last activity
        { result: false },              // guardianSetupComplete = false
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useChallengePeriodPreview('0xVault' as any)
    );

    expect(result.current.effectiveSeconds).toBe(FOURTEEN_DAYS_S);
    expect(result.current.basePeriodSeconds).toBe(FOURTEEN_DAYS_S);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.reason).toMatch(/Guardian setup incomplete/);
  });

  it('returns 7-day standard period when setup complete and vault inactive', () => {
    mockUseReadContracts.mockReturnValue({
      data: [
        { result: 0n },                 // no user preference
        { result: 0n },                 // no recent activity (timestamp 0)
        { result: true },               // guardianSetupComplete = true
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useChallengePeriodPreview('0xVault' as any)
    );

    expect(result.current.effectiveSeconds).toBe(SEVEN_DAYS_S);
    expect(result.current.basePeriodSeconds).toBe(SEVEN_DAYS_S);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.vaultConsideredActive).toBe(false);
  });

  it('returns 14-day extended period when vault was active recently', () => {
    const recentActivity = BigInt(NOW_S - 5 * 24 * 3600); // 5 days ago
    mockUseReadContracts.mockReturnValue({
      data: [
        { result: 0n },
        { result: recentActivity },     // active 5 days ago (within 30-day window)
        { result: true },               // setup complete
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useChallengePeriodPreview('0xVault' as any)
    );

    expect(result.current.vaultConsideredActive).toBe(true);
    expect(result.current.effectiveSeconds).toBe(FOURTEEN_DAYS_S);
    expect(result.current.reason).toMatch(/active within/);
  });

  it('honours user preference when it exceeds the base period', () => {
    const THIRTY_DAYS_S = 30 * 24 * 3600;
    mockUseReadContracts.mockReturnValue({
      data: [
        { result: BigInt(THIRTY_DAYS_S) }, // user wants 30 days
        { result: 0n },
        { result: true },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useChallengePeriodPreview('0xVault' as any)
    );

    expect(result.current.effectiveSeconds).toBe(THIRTY_DAYS_S);
    expect(result.current.userPreferenceSeconds).toBe(THIRTY_DAYS_S);
    expect(result.current.reason).toMatch(/custom preference/);
  });

  it('returns isLoading=true with default values while loading', () => {
    mockUseReadContracts.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() =>
      useChallengePeriodPreview('0xVault' as any)
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.effectiveSeconds).toBe(SEVEN_DAYS_S); // default while loading
  });
});
