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
const VAULT_HUB_ADDRESS = '0x...' as `0x${string}`; // Will be populated from deployment

/**
 * Hook to check if the connected user has a vault
 * Returns vault address if exists, null if not
 */
export function useHasVault() {
  const { address, isConnected } = useAccount();

  const { data: vaultAddress, isLoading } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VAULT_HUB_ABI,
    functionName: 'userVaults',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const hasVault = useMemo(() => {
    if (!vaultAddress) return false;
    return vaultAddress !== '0x0000000000000000000000000000000000000000';
  }, [vaultAddress]);

  return {
    hasVault,
    vaultAddress: hasVault ? vaultAddress : null,
    isLoading,
    isConnected,
  };
}
