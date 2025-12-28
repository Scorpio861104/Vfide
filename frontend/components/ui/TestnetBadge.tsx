"use client";

import Link from 'next/link';
import { useChainId, useAccount } from 'wagmi';
import { baseSepolia, polygonAmoy, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { IS_TESTNET, CURRENT_CHAIN_ID } from '@/lib/testnet';

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
 * Corner badge for testnet - links to setup guide
 * Shows "Setup" when not properly connected, "Testnet" when connected
 */
export function TestnetCornerBadge() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  
  // Only show if IS_TESTNET is true
  if (!IS_TESTNET) return null;
  
  const isCorrectNetwork = chainId === CURRENT_CHAIN_ID;
  const needsSetup = !isConnected || !isCorrectNetwork;

  // If not connected or wrong network, show prominent setup link
  if (needsSetup) {
    return (
      <Link 
        href="/setup"
        className="fixed top-20 left-4 z-50 bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse"
      >
        ⚙️ Setup Guide
      </Link>
    );
  }

  // Connected and on correct network - subtle indicator
  return (
    <Link 
      href="/setup"
      className="fixed top-20 left-4 z-50 bg-amber-500/80 hover:bg-amber-500 text-black px-2 py-0.5 rounded text-xs font-medium"
    >
      Testnet
    </Link>
  );
}
