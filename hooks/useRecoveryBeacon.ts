'use client';

/**
 * useRecoveryBeacon — protocol-wide "someone needs you" indicator.
 *
 * A guardian who's on a coffee break shouldn't need to refresh the
 * /guardians page to know there's a recovery in flight. This hook
 * watches the user's guardian watchlist for any vault that enters
 * recovery, so the AppShell-mounted RecoveryBeacon can light up no
 * matter what page the guardian is on.
 *
 * Subscription model:
 *   - Pull the user's watchlist (local: addresses they've added as
 *     vaults they guard).
 *   - Subscribe to VaultRecoveryClaim's ClaimInitiated event filtered
 *     by vault address (when wagmi supports indexed args filter; we
 *     fall back to subscribing all and filtering in the handler).
 *   - On Initiated: add to active set.
 *   - On Executed / Rejected / Expired: remove from active set.
 *
 * State storage: in-memory only. Closes the visibility gap during
 * active sessions — if a guardian closes the tab and reopens it, the
 * beacon won't show until a new event arrives or we add a one-shot
 * read against the recovery contract. That's a deliberate scope
 * boundary: pushing the "recovery in progress" history into a server
 * cache would require an off-chain index, which we don't have. For
 * v1, live-only is honest.
 */

import { useEffect, useMemo, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { useContractAddresses } from './useContractAddresses';
import { useGuardianWatchlist } from '@/app/guardians/components/hooks';

interface ActiveClaim {
  vault: `0x${string}`;
  vaultLabel?: string;
  claimId: bigint;
  initiatedAt: number;
}

interface UseRecoveryBeaconResult {
  /** Distinct vaults currently in recovery, drawn from the user's watchlist. */
  activeClaims: ActiveClaim[];
  /** Convenience flag — true iff at least one claim is active. */
  isActive: boolean;
}

export function useRecoveryBeacon(): UseRecoveryBeaconResult {
  const { entries } = useGuardianWatchlist();
  const addresses = useContractAddresses();
  const claimContract = addresses.VaultRecoveryClaim;

  const watched = useMemo(
    () => new Set(entries.map((e) => e.address.toLowerCase())),
    [entries],
  );

  const [active, setActive] = useState<Map<string, ActiveClaim>>(new Map());

  useWatchContractEvent({
    address: claimContract,
    abi: VaultRecoveryClaimABI,
    eventName: 'ClaimInitiated',
    onLogs: (logs) => {
      setActive((prev) => {
        const next = new Map(prev);
        for (const log of logs) {
          const args = (log as unknown as {
            args?: { vault?: `0x${string}`; claimId?: bigint };
          }).args;
          if (!args?.vault || args.claimId === undefined) continue;
          const vaultLc = args.vault.toLowerCase();
          if (!watched.has(vaultLc)) continue;
          const key = `${vaultLc}:${args.claimId.toString()}`;
          const labelEntry = entries.find((e) => e.address.toLowerCase() === vaultLc);
          next.set(key, {
            vault: args.vault,
            vaultLabel: labelEntry?.label,
            claimId: args.claimId,
            initiatedAt: Date.now(),
          });
        }
        return next;
      });
    },
  });

  // Lifecycle-terminating events: each one removes the matching claim
  // from the active map. We can't loop these — useWatchContractEvent
  // must be called at the top level (Rules of Hooks).

  const reapHandler = (logs: readonly unknown[]) => {
    setActive((prev) => {
      let next: Map<string, ActiveClaim> | null = null;
      for (const log of logs) {
        const args = (log as { args?: { vault?: `0x${string}`; claimId?: bigint } }).args;
        if (!args?.vault || args.claimId === undefined) continue;
        const vaultLc = args.vault.toLowerCase();
        const key = `${vaultLc}:${args.claimId.toString()}`;
        if (prev.has(key)) {
          if (!next) next = new Map(prev);
          next.delete(key);
        }
      }
      return next ?? prev;
    });
  };

  useWatchContractEvent({
    address: claimContract,
    abi: VaultRecoveryClaimABI,
    eventName: 'ClaimExecuted',
    onLogs: reapHandler,
  });
  useWatchContractEvent({
    address: claimContract,
    abi: VaultRecoveryClaimABI,
    eventName: 'ClaimRejected',
    onLogs: reapHandler,
  });
  useWatchContractEvent({
    address: claimContract,
    abi: VaultRecoveryClaimABI,
    eventName: 'ClaimExpired',
    onLogs: reapHandler,
  });

  // Reset active if watchlist changes (a vault was removed).
  useEffect(() => {
    setActive((prev) => {
      const next = new Map<string, ActiveClaim>();
      for (const [k, v] of prev.entries()) {
        if (watched.has(v.vault.toLowerCase())) next.set(k, v);
      }
      return next;
    });
  }, [watched]);

  const activeClaims = useMemo(() => Array.from(active.values()), [active]);
  return { activeClaims, isActive: activeClaims.length > 0 };
}
