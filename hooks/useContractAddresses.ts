'use client';

import { useChainId } from 'wagmi';
import { getContractAddresses } from '@/lib/contracts';

/**
 * Chain-aware contract address hook.
 * Returns addresses scoped to the user's currently connected chain.
 * Falls back to the configured default chain when the wallet chain is unknown.
 */
export function useContractAddresses() {
  const chainId = useChainId();
  return getContractAddresses(chainId);
}
