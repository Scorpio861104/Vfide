'use client';

/**
 * useChallengePeriodPreview
 *
 * Computes what the effective challenge period would be if a recovery claim
 * were initiated against a vault RIGHT NOW.
 *
 * The VaultRecoveryClaim contract uses the following logic when snapshotting
 * the challenge period at claim initiation time:
 *
 *   1. If the vault has been active recently (within ACTIVITY_WINDOW = 90 days),
 *      baseChallengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD (14 days)
 *   2. Otherwise, baseChallengePeriod = CHALLENGE_PERIOD (7 days)
 *   3. effectiveChallengePeriod = max(userPreference, baseChallengePeriod)
 *
 * This hook reads:
 *   - vault.challengePeriodPreferenceView() → user's custom preference (0 = use base)
 *   - VaultRecoveryClaim.vaultLastActivity(vaultAddress) → last recorded activity timestamp
 *
 * And then computes the effective preview without any on-chain call.
 *
 * Usage in ClaimFlowModal: show the user how long the challenge window will be
 * so they know how long they must wait after guardian approval before finalizing.
 *
 * Backlog item: Phase 2 Turn 2 — Add useChallengePeriodPreview + surface in ClaimFlowModal.
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { ACTIVE_VAULT_ABI, CONTRACT_ADDRESSES, isConfiguredContractAddress, ZERO_ADDRESS } from '@/lib/contracts';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';

// Mirror the contract constants exactly. Source of truth:
//   contracts/VaultRecoveryClaim.sol
//     CHALLENGE_PERIOD              = 7 days
//     ACTIVE_VAULT_CHALLENGE_PERIOD = 14 days
//     VAULT_ACTIVITY_WINDOW         = 30 days
const CHALLENGE_PERIOD_SECS = 7 * 24 * 3600;          // 7 days
const ACTIVE_VAULT_CHALLENGE_PERIOD_SECS = 14 * 24 * 3600; // 14 days
const ACTIVITY_WINDOW_SECS = 30 * 24 * 3600;           // 30 days (was incorrectly 90 days)

export interface ChallengePeriodPreview {
  /** Effective challenge period in seconds */
  effectiveSeconds: number;
  /** Human-readable label, e.g. "14 days" */
  label: string;
  /** Why this period was chosen */
  reason: string;
  /** Whether the vault is considered "active" for the purpose of this calculation */
  vaultConsideredActive: boolean;
  /** The user's custom preference in seconds (0 = no preference) */
  userPreferenceSeconds: number;
  /** The base period chosen before applying user preference */
  basePeriodSeconds: number;
  /** True while loading on-chain data */
  isLoading: boolean;
}

function formatDays(seconds: number): string {
  const days = seconds / 86400;
  if (days === Math.floor(days)) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${(days).toFixed(1)} days`;
}

/**
 * useChallengePeriodPreview
 *
 * @param vaultAddress  The vault whose challenge period we're previewing
 */
export function useChallengePeriodPreview(
  vaultAddress: Address | undefined
): ChallengePeriodPreview {
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;
  const configured = isConfiguredContractAddress(recoveryAddress);
  const enabled = !!vaultAddress && vaultAddress !== ZERO_ADDRESS && configured;

  const { data, isLoading } = useReadContracts({
    contracts: [
      // 1. vault.challengePeriodPreferenceView()
      {
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI as any,
        functionName: 'challengePeriodPreferenceView',
      },
      // 2. VaultRecoveryClaim.vaultLastActivity(vault)
      {
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'vaultLastActivity',
        args: vaultAddress ? [vaultAddress] : undefined,
      },
    ],
    query: { enabled },
  });

  return useMemo<ChallengePeriodPreview>(() => {
    if (!enabled || isLoading) {
      return {
        effectiveSeconds: CHALLENGE_PERIOD_SECS,
        label: `${formatDays(CHALLENGE_PERIOD_SECS)} (loading…)`,
        reason: 'Loading vault data…',
        vaultConsideredActive: false,
        userPreferenceSeconds: 0,
        basePeriodSeconds: CHALLENGE_PERIOD_SECS,
        isLoading: true,
      };
    }

    const userPreferenceRaw = data?.[0]?.result as bigint | undefined;
    const lastActivityRaw = data?.[1]?.result as bigint | undefined;

    const userPreferenceSeconds = Number(userPreferenceRaw ?? 0n);
    const lastActivityTimestamp = Number(lastActivityRaw ?? 0n);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const vaultConsideredActive =
      lastActivityTimestamp > 0 &&
      nowSeconds - lastActivityTimestamp <= ACTIVITY_WINDOW_SECS;

    const basePeriodSeconds = vaultConsideredActive
      ? ACTIVE_VAULT_CHALLENGE_PERIOD_SECS
      : CHALLENGE_PERIOD_SECS;

    const effectiveSeconds = userPreferenceSeconds > basePeriodSeconds
      ? userPreferenceSeconds
      : basePeriodSeconds;

    let reason: string;
    if (userPreferenceSeconds > basePeriodSeconds) {
      reason = `Your custom preference (${formatDays(userPreferenceSeconds)}) exceeds the base period.`;
    } else if (vaultConsideredActive) {
      reason = `Vault was active within the last ${ACTIVITY_WINDOW_SECS / 86400} days → extended base period applies.`;
    } else {
      reason = 'Standard 7-day base period (vault inactive or no activity recorded).';
    }

    return {
      effectiveSeconds,
      label: formatDays(effectiveSeconds),
      reason,
      vaultConsideredActive,
      userPreferenceSeconds,
      basePeriodSeconds,
      isLoading: false,
    };
  }, [data, isLoading, enabled]);
}
