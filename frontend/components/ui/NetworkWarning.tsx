"use client";

import { useAccount, useChainId } from 'wagmi';
import { sepolia, mainnet, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/**
 * Shows a warning when user is connected to wrong network
 * Simplified - just shows instructions, no broken programmatic switching
 */
export function NetworkWarning() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Get expected chain from env - default to zkSync Sepolia for testnet (chain ID 300)
  const envChainId = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const expectedChainId = envChainId === '1' ? mainnet.id : 
                          envChainId === '300' ? zkSyncSepoliaTestnet.id : 
                          zkSyncSepoliaTestnet.id; // Default to zkSync Sepolia
  const expectedChain = expectedChainId === mainnet.id ? mainnet : 
                        expectedChainId === zkSyncSepoliaTestnet.id ? zkSyncSepoliaTestnet :
                        zkSyncSepoliaTestnet;
  
  // Show warning if connected but on wrong chain
  const showWarning = isConnected && chainId !== expectedChainId;

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-16 left-0 right-0 z-[90] bg-gradient-to-r from-red-900/95 to-orange-900/95 backdrop-blur-sm border-b border-red-500"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-white">
                <AlertTriangle className="text-yellow-400 flex-shrink-0" size={24} />
                <div className="text-center sm:text-left">
                  <p className="font-bold text-lg">
                    Wrong Network
                  </p>
                  <p className="text-sm text-gray-200">
                    Switch to <strong className="text-yellow-300">{expectedChain.name}</strong> in your wallet app
                  </p>
                </div>
              </div>
              
              <Link 
                href="/testnet"
                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                View Setup Guide <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
