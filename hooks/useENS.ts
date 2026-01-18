"use client";

import { useState, useEffect } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';
import { mainnet } from 'wagmi/chains';

/**
 * ENS Name Resolution Hook
 * 
 * Phase 3: Resolve ENS names for addresses
 */
export function useENS(address: string | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use wagmi's ENS hooks
  const { data: resolvedName, isLoading: nameLoading } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id as number as 8453, // Cast for wagmi type compatibility
    query: {
      enabled: !!address,
      staleTime: 1000 * 60 * 60, // 1 hour cache
    },
  });

  const { data: resolvedAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: resolvedName ? normalize(resolvedName) : undefined,
    chainId: mainnet.id as number as 8453, // Cast for wagmi type compatibility
    query: {
      enabled: !!resolvedName,
      staleTime: 1000 * 60 * 60, // 1 hour cache
    },
  });

  useEffect(() => {
    setIsLoading(nameLoading || avatarLoading);
  }, [nameLoading, avatarLoading]);

  useEffect(() => {
    setEnsName(resolvedName || null);
  }, [resolvedName]);

  useEffect(() => {
    setEnsAvatar(resolvedAvatar || null);
  }, [resolvedAvatar]);

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
