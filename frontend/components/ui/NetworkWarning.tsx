"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, mainnet, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shows a warning when user is connected to wrong network
 */
export function NetworkWarning() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

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

  const handleSwitch = () => {
    switchChain({ chainId: expectedChainId });
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-16 left-0 right-0 z-[90] bg-red-900/95 backdrop-blur-sm border-b border-red-500"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <AlertTriangle className="text-red-400" size={20} />
              <span>
                Wrong network detected. Please switch to{' '}
                <strong className="text-red-300">{expectedChain.name}</strong>
              </span>
            </div>
            <button
              onClick={handleSwitch}
              disabled={isPending}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Switching...' : `Switch to ${expectedChain.name}`}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
