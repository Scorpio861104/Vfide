'use client';

import { useChainId } from 'wagmi';
import * as contracts from '@/lib/contracts';

/**
 * Chain-aware contract address hook.
 * Returns addresses scoped to the user's currently connected chain.
 * Falls back to the configured default chain when the wallet chain is unknown.
 */
export function useContractAddresses() {
  const chainId = useChainId();
  if (typeof contracts.getContractAddresses === 'function') {
    return contracts.getContractAddresses(chainId);
  }

  // Some unit tests partially mock `@/lib/contracts` and only provide
  // `CONTRACT_ADDRESSES`; fall back so hooks remain testable.
  return contracts.CONTRACT_ADDRESSES;
}
