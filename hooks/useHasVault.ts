'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { VAULT_HUB_ABI, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';
import { logger } from '@/lib/logger';
import { useContractAddresses } from './useContractAddresses';

/**
 * Hook to check if the connected user has a vault
 * Returns vault address if exists, null if not
 */
export function useHasVault() {
  const { address, isConnected } = useAccount();
  const contractAddresses = useContractAddresses();
  const isAvailable = isConfiguredContractAddress(contractAddresses.VaultHub);

  const { data: vaultAddress, isLoading, isError, error } = useReadContract({
    address: contractAddresses.VaultHub,
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
