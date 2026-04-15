'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { CONTRACT_ADDRESSES, VAULT_HUB_ABI, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';
import { logger } from '@/lib/logger';

const VAULT_HUB_ADDRESS = CONTRACT_ADDRESSES.VaultHub;

/**
 * Hook to check if the connected user has a vault
 * Returns vault address if exists, null if not
 */
export function useHasVault() {
  const { address, isConnected } = useAccount();
  const isAvailable = isConfiguredContractAddress(VAULT_HUB_ADDRESS);

  const { data: vaultAddress, isLoading, isError, error } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && isAvailable,
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
    logger.error('Error checking vault status:', error);
  }

  return {
    hasVault,
    vaultAddress: hasVault ? vaultAddress : null,
    isLoading,
    isError,
    isConnected,
    isAvailable,
  };
}
