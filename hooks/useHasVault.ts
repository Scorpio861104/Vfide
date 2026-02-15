'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { VaultHubABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { ZERO_ADDRESS } from '@/lib/constants';

// VaultHub address (from deployment)
const VAULT_HUB_ADDRESS = CONTRACT_ADDRESSES.VaultHub;

/**
 * Hook to check if the connected user has a vault
 * Returns vault address if exists, null if not
 */
export function useHasVault() {
  const { address, isConnected } = useAccount();

  const isConfigured = VAULT_HUB_ADDRESS !== ZERO_ADDRESS;

  const { data: vaultAddress, isLoading, isError, error } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VaultHubABI,
    functionName: 'userVaults',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && isConfigured,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const hasVault = useMemo(() => {
    if (!vaultAddress) return false;
    return vaultAddress !== ZERO_ADDRESS;
  }, [vaultAddress]);

  // Log errors for debugging
  if (isError && error) {
    console.error('Error checking vault status:', error);
  }

  return {
    hasVault,
    vaultAddress: hasVault ? vaultAddress : null,
    isLoading,
    isError,
    isConnected,
  };
}
