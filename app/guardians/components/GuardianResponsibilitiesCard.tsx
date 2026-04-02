'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { USER_VAULT_ABI, isCardBoundVaultMode } from '@/lib/contracts';
import { shortAddress } from './types';

export function GuardianResponsibilitiesCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const recoverySupported = !isCardBoundVaultMode();

  const { data: owner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: recoverySupported },
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const activeRecovery = !!recovery && recovery[4];

  const status = !isGuardian
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
          <p className="text-gray-500 text-xs mt-1">Owner: {owner ? shortAddress(owner as string) : 'Loading...'}</p>
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
