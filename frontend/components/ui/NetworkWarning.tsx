"use client";

import { useAccount, useChainId } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { IS_TESTNET, CURRENT_CHAIN_ID } from '@/lib/testnet';

/**
 * Shows a warning when user is connected to wrong network
 * Uses IS_TESTNET config for proper chain detection
 */
export function NetworkWarning() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Use centralized config for expected chain
  const expectedChainId = CURRENT_CHAIN_ID;
  const expectedChain = IS_TESTNET ? baseSepolia : base;
  
  // Show warning if connected but on wrong chain
  const showWarning = isConnected && chainId !== expectedChainId;

  // Link to setup guide only on testnet
  const helpLink = IS_TESTNET ? '/testnet' : '/docs';

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
                href={helpLink}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                {IS_TESTNET ? 'View Setup Guide' : 'Learn More'} <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
