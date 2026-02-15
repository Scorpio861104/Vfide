'use client';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';
import { mainnet } from 'wagmi/chains';

/**
 * ENS Name Resolution Hook
 * 
 * Phase 3: Resolve ENS names for addresses
 */
export function useENS(address: string | undefined) {
  // Use wagmi's ENS hooks
  const { data: resolvedName, isLoading: nameLoading } = useEnsName({
    address: address as `0x${string}` | undefined,
    // @ts-expect-error ENS requires mainnet (chain 1) which is not in wagmi config
    chainId: mainnet.id,
    query: {
      enabled: !!address,
      staleTime: 1000 * 60 * 60, // 1 hour cache
    },
  });

  const { data: resolvedAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: resolvedName ? normalize(resolvedName) : undefined,
    // @ts-expect-error ENS requires mainnet (chain 1) which is not in wagmi config
    chainId: mainnet.id,
    query: {
      enabled: !!resolvedName,
      staleTime: 1000 * 60 * 60, // 1 hour cache
    },
  });

  const isLoading = nameLoading || avatarLoading;
  const ensName = resolvedName || null;
  const ensAvatar = resolvedAvatar || null;

  return {
    ensName,
    ensAvatar,
    isLoading,
    hasENS: !!ensName,
  };
}

/**
 * Format address with ENS name if available
 */
export function formatAddressWithENS(
  address: string | undefined,
  ensName: string | null
): string {
  if (!address) return '';
  
  if (ensName) {
    return ensName;
  }
  
  // Truncate address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
