"use client";

import { useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';

/**
 * Displays a prominent testnet indicator when connected to a test network
 */
export function TestnetBadge() {
  const chainId = useChainId();
  
  // Only show on testnets
  const isTestnet = chainId === sepolia.id;
  
  if (!isTestnet) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 text-black text-center py-1 text-sm font-bold">
      ⚠️ TESTNET MODE - Using Sepolia Test Network - Tokens have no real value ⚠️
    </div>
  );
}

/**
 * Corner badge for testnet - less intrusive option
 */
export function TestnetCornerBadge() {
  const chainId = useChainId();
  
  const isTestnet = chainId === sepolia.id;
  
  if (!isTestnet) return null;

  return (
    <div className="fixed top-20 left-4 z-50 bg-orange-500/90 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
      🧪 TESTNET
    </div>
  );
}
