"use client";

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
      className="flex items-center gap-2 px-3 py-1.5 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg hover:border-[#00F0FF] transition-colors text-sm"
      title={hasVault ? `Vault: ${vaultAddress}` : 'No vault detected'}
    >
      {isLoadingVault ? (
        <>
          <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-pulse" />
          <span className="text-[#A0A0A5]">Checking...</span>
        </>
      ) : hasVault ? (
        <>
          <div className="w-2 h-2 bg-[#50C878] rounded-full" />
          <span className="text-[#50C878] font-semibold">🏦 Vault</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-pulse" />
          <span className="text-[#FFA500]">⚠️ No Vault</span>
        </>
      )}
    </Link>
  );
}
