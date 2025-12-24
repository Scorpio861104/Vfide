"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, mainnet, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useChainModal } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

/**
 * Shows a warning when user is connected to wrong network
 */
export function NetworkWarning() {
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { openChainModal } = useChainModal();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

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
      if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
        setSwitchError('Rejected - please approve in your wallet');
      } else if (errorMessage.includes('Unrecognized chain')) {
        setSwitchError('Network not found - use manual setup');
        setShowHelp(true);
      } else {
        setSwitchError('Open your wallet app to approve');
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
          className="fixed top-16 left-0 right-0 z-[90] bg-gradient-to-r from-red-900/95 to-orange-900/95 backdrop-blur-sm border-b border-red-500"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              {/* Main warning row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-white text-center sm:text-left">
                  <AlertTriangle className="text-yellow-400 flex-shrink-0" size={24} />
                  <div>
                    <span className="font-bold">
                      Wrong Network
                    </span>
                    <span className="hidden sm:inline text-gray-300 ml-2">
                      Switch to <strong className="text-yellow-300">{expectedChain.name}</strong>
                    </span>
                    {switchError && (
                      <p className="text-yellow-300 text-sm">{switchError}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openChainModal?.()}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    Select Network
                  </button>
                  <button
                    onClick={handleSwitch}
                    disabled={isPending}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Waiting...</span>
                      </>
                    ) : (
                      <>Switch</>
                    )}
                  </button>
                </div>
              </div>

              {/* WalletConnect waiting indicator */}
              {isPending && isWalletConnect && (
                <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm animate-pulse">
                  <span>👆</span>
                  <span>Open your wallet app (MetaMask, Trust, etc.) to approve the switch</span>
                </div>
              )}

              {/* Help section */}
              {showHelp && (
                <div className="text-center">
                  <Link 
                    href="/testnet" 
                    className="inline-flex items-center gap-1 text-yellow-300 hover:text-yellow-100 text-sm underline"
                  >
                    Need help? Visit our setup guide <ExternalLink size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
