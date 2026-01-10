'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';

// VaultHub ABI - just the functions we need
const VAULT_HUB_ABI = [
  {
    name: 'userVaults',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'vault', type: 'address' }],
  },
] as const;

// VaultHub address (from deployment)
// Base: 0x090014f269f642656394E2FEaB038b92387B4db3
// Base Sepolia: 0x090014f269f642656394E2FEaB038b92387B4db3
const VAULT_HUB_ADDRESS = (process.env.NEXT_PUBLIC_VAULTHUB_ADDRESS || '0x090014f269f642656394E2FEaB038b92387B4db3') as `0x${string}`;

/**
 * Hook to check if the connected user has a vault
 * Returns vault address if exists, null if not
 */
export function useHasVault() {
  const { address, isConnected } = useAccount();

  const { data: vaultAddress, isLoading, isError, error } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VAULT_HUB_ABI,
    functionName: 'userVaults',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const hasVault = useMemo(() => {
    if (!vaultAddress) return false;
    return vaultAddress !== '0x0000000000000000000000000000000000000000';
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
