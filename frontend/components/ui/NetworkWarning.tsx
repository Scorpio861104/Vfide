"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, mainnet, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

/**
 * Shows a warning when user is connected to wrong network
 */
export function NetworkWarning() {
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

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

  const handleSwitch = async () => {
    setSwitchError(null);
    try {
      await switchChain({ chainId: expectedChainId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch network';
      // Check for common WalletConnect errors
      if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
        setSwitchError('Please approve the network switch in your wallet');
      } else if (errorMessage.includes('Unrecognized chain')) {
        setSwitchError('Please add zkSync Sepolia manually in your wallet');
      } else {
        setSwitchError('Please switch to zkSync Sepolia in your wallet app');
      }
    }
  };

  // Check if using WalletConnect
  const isWalletConnect = connector?.id === 'walletConnect';

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-16 left-0 right-0 z-[90] bg-red-900/95 backdrop-blur-sm border-b border-red-500"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white text-center sm:text-left">
                <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                <div>
                  <span>
                    Wrong network. Please switch to{' '}
                    <strong className="text-red-300">{expectedChain.name}</strong>
                  </span>
                  {switchError && (
                    <p className="text-yellow-300 text-sm mt-1">{switchError}</p>
                  )}
                  {isWalletConnect && !switchError && (
                    <p className="text-gray-300 text-xs mt-1">
                      Open your wallet app to approve the network switch
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleSwitch}
                disabled={isPending}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Switching...
                  </>
                ) : (
                  `Switch Network`
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
