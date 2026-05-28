'use client';

/**
 * GuardianResponsibilitiesCard
 *
 * Single watchlist row showing the user's guardianship status for one vault.
 *
 * Pre-cleanup, this file had a parallel "legacy / non-CardBound" code path
 * (reading USER_VAULT_ABI for `owner`, `isGuardian`, `isGuardianMature`,
 * and `getRecoveryStatus`) gated by `recoverySupported = !cardBoundMode`.
 * Since `isCardBoundVaultMode()` returns true unconditionally in this
 * build, those reads were permanently disabled and the matching status
 * labels never rendered. Removed — only the CardBound path remains.
 */

import { useReadContract } from 'wagmi';

import {
  CARD_BOUND_VAULT_ABI,
  CONTRACT_ADDRESSES,
  VAULT_HUB_ABI,
  ZERO_ADDRESS,
  isConfiguredContractAddress,
} from '@/lib/contracts';
import { shortAddress, type WatchedVault } from './types';

export function GuardianResponsibilitiesCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'ownerOfVault',
    args: [entry.address],
    query: { enabled: isVaultHubAvailable },
  });

  const { data: isGuardianRaw } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: guardianSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: [entry.address],
    query: { enabled: isVaultHubAvailable },
  });

  const { data: pendingRotation } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'pendingRotation',
  });

  const isGuardian = Boolean(isGuardianRaw);
  const isGuardianSetupComplete = Boolean(guardianSetupComplete);
  const pendingRotationData = pendingRotation as {
    newWallet: `0x${string}`;
    activateAt: bigint;
    approvals: bigint;
    proposalNonce: bigint;
  } | undefined;
  const hasPendingRotation =
    !!pendingRotationData && pendingRotationData.newWallet !== ZERO_ADDRESS;

  const status = !isGuardian
    ? { label: 'Not Assigned', className: 'text-red-300 bg-red-500/20' }
    : !isGuardianSetupComplete
      ? { label: 'Setup Pending', className: 'text-yellow-300 bg-yellow-500/20' }
      : hasPendingRotation
        ? { label: 'Action Required', className: 'text-amber-300 bg-amber-500/20' }
        : { label: 'Healthy', className: 'text-green-300 bg-green-500/20' };

  const ownerAddress = owner as string | undefined;

  return (
    <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-white font-bold truncate">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono truncate">{entry.address}</p>
          <p className="text-gray-500 text-xs mt-1">
            Owner: {ownerAddress ? shortAddress(ownerAddress) : 'Loading…'}
          </p>
          {isGuardian && (
            <p className="text-gray-500 text-xs mt-1">
              {isGuardianSetupComplete
                ? hasPendingRotation
                  ? 'A wallet rotation is awaiting guardian action.'
                  : 'Guardian protections are active for this CardBound vault.'
                : 'Guardian setup must be completed before rotation approvals are available.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>
            {status.label}
          </span>
          {onRemove ? (
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-accent/40 text-cyan-300 rounded-lg text-xs font-bold">
              Attested
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
