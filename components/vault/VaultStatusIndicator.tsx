'use client';

import { useVaultHub } from '@/hooks/useVaultHub';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export function VaultStatusIndicator() {
  const { isConnected } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault } = useVaultHub();

  if (!isConnected) return null;

  return (
    <Link
      href="/vault"
      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-cyan-400 transition-colors text-sm"
      title={hasVault ? `Vault: ${vaultAddress}` : 'No vault detected'}
    >
      {isLoadingVault ? (
        <>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-zinc-400">Checking...</span>
        </>
      ) : hasVault ? (
        <>
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-emerald-500 font-semibold">🏦 Vault</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-orange-500">⚠️ No Vault</span>
        </>
      )}
    </Link>
  );
}
