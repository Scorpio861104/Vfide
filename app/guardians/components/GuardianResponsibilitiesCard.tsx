'use client';

import { useReadContract } from 'wagmi';

import {
  CARD_BOUND_VAULT_ABI,
  CONTRACT_ADDRESSES,
  USER_VAULT_ABI,
  VAULT_HUB_ABI,
  ZERO_ADDRESS,
  isConfiguredContractAddress,
  isCardBoundVaultMode,
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
  const cardBoundMode = isCardBoundVaultMode();
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);
  const recoverySupported = !cardBoundMode;

  const { data: legacyOwner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: recoverySupported },
  });

  const { data: cardBoundOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'ownerOfVault',
    args: [entry.address],
    query: { enabled: isVaultHubAvailable && cardBoundMode },
  });

  const { data: legacyIsGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: cardBoundIsGuardian } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: cardBoundMode && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!legacyIsGuardian },
  });

  const { data: recoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported },
  });

  const { data: guardianSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: [entry.address],
    query: { enabled: isVaultHubAvailable && cardBoundMode },
  });

  const { data: pendingRotation } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'pendingRotation',
    query: { enabled: cardBoundMode },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const activeRecovery = !!recovery && recovery[4];

  const owner = (cardBoundMode ? cardBoundOwner : legacyOwner) as string | undefined;
  const isGuardian = Boolean(cardBoundMode ? cardBoundIsGuardian : legacyIsGuardian);
  const isGuardianSetupComplete = Boolean(guardianSetupComplete);
  const pendingRotationData = pendingRotation as {
    newWallet: `0x${string}`;
    activateAt: bigint;
    approvals: bigint;
    proposalNonce: bigint;
  } | undefined;
  const hasPendingRotation = !!pendingRotationData && pendingRotationData.newWallet !== ZERO_ADDRESS;

  const status = cardBoundMode
    ? !isGuardian
      ? { label: 'Not Assigned', className: 'text-red-300 bg-red-500/20' }
      : !isGuardianSetupComplete
        ? { label: 'Setup Pending', className: 'text-yellow-300 bg-yellow-500/20' }
        : hasPendingRotation
          ? { label: 'Action Required', className: 'text-amber-300 bg-amber-500/20' }
          : { label: 'Healthy', className: 'text-green-300 bg-green-500/20' }
    : !isGuardian
      ? { label: 'Not Assigned', className: 'text-red-300 bg-red-500/20' }
      : !isGuardianMature
        ? { label: 'Maturing', className: 'text-yellow-300 bg-yellow-500/20' }
        : activeRecovery
          ? { label: 'Action Required', className: 'text-amber-300 bg-amber-500/20' }
          : { label: 'Healthy', className: 'text-green-300 bg-green-500/20' };

  return (
    <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-white font-bold">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
          <p className="text-gray-500 text-xs mt-1">Owner: {owner ? shortAddress(owner) : 'Loading...'}</p>
          {cardBoundMode && isGuardian && (
            <p className="text-gray-500 text-xs mt-1">
              {isGuardianSetupComplete
                ? hasPendingRotation
                  ? 'A wallet rotation is awaiting guardian action.'
                  : 'Guardian protections are active for this CardBound vault.'
                : 'Guardian setup must be completed before rotation approvals are available.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>{status.label}</span>
          {onRemove ? (
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold">Attested</span>
          )}
        </div>
      </div>
    </div>
  );
}
