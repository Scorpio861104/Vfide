"use client";

import { useChainId } from 'wagmi';
import { baseSepolia, polygonAmoy, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { IS_TESTNET } from '@/lib/testnet';

/**
 * Displays a prominent testnet indicator when connected to a test network
 * Hidden when IS_TESTNET is false (mainnet mode)
 */
export function TestnetBadge() {
  const chainId = useChainId();
  
  // Only show if IS_TESTNET is true AND on a test network
  if (!IS_TESTNET) return null;
  
  // Supported testnet chains: Base Sepolia, Polygon Amoy, zkSync Sepolia
  const isTestnetChain = chainId === baseSepolia.id || chainId === polygonAmoy.id || chainId === zkSyncSepoliaTestnet.id;
  if (!isTestnetChain) return null;

  const getNetworkName = () => {
    if (chainId === baseSepolia.id) return 'Base Sepolia';
    if (chainId === polygonAmoy.id) return 'Polygon Amoy';
    if (chainId === zkSyncSepoliaTestnet.id) return 'zkSync Sepolia';
    return 'Testnet';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 text-black text-center py-1 text-sm font-bold">
      ⚠️ TESTNET MODE - Using {getNetworkName()} Test Network - Tokens have no real value ⚠️
    </div>
  );
}

/**
 * Corner badge for testnet - subtle indicator
 * Hidden when IS_TESTNET is false (mainnet mode)
 */
export function TestnetCornerBadge() {
  const chainId = useChainId();
  
  // Only show if IS_TESTNET is true
  if (!IS_TESTNET) return null;
  
  // Supported testnet chains: Base Sepolia, Polygon Amoy, zkSync Sepolia
  const isTestnetChain = chainId === baseSepolia.id || chainId === polygonAmoy.id || chainId === zkSyncSepoliaTestnet.id;
  if (!isTestnetChain) return null;

  return (
    <span className="fixed top-20 left-4 z-50 bg-amber-500/80 text-black px-2 py-0.5 rounded text-xs font-medium">
      Testnet
    </span>
  );
}
