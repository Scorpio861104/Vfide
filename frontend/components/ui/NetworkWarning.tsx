"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mainnet, zkSyncSepoliaTestnet } from 'wagmi/chains';
import { AlertTriangle, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

/**
 * Shows a warning when user is connected to wrong network
 */
export function NetworkWarning() {
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

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
        setSwitchError('Rejected - try again or add manually');
      } else if (errorMessage.includes('Unrecognized chain')) {
        setSwitchError('Network not found - add it manually');
        setShowManual(true);
      } else {
        setSwitchError('Failed - check your wallet or add manually');
        setShowManual(true);
      }
    }
  };

  const copyRPC = () => {
    navigator.clipboard.writeText('https://sepolia.era.zksync.dev');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="container mx-auto px-4 py-4">
            {/* Main Warning Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white text-center sm:text-left">
                <AlertTriangle className="text-yellow-400 flex-shrink-0 animate-pulse" size={24} />
                <div>
                  <span className="font-bold text-lg">
                    Wrong Network
                  </span>
                  <p className="text-sm text-gray-200">
                    Switch to <strong className="text-yellow-300">{expectedChain.name}</strong> to use VFIDE
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSwitch}
                  disabled={isPending}
                  className="px-5 py-2.5 bg-white text-red-900 font-bold rounded-lg transition-all hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    '🔄 Switch Now'
                  )}
                </button>
                
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="px-3 py-2.5 border border-white/50 text-white rounded-lg hover:bg-white/10 text-sm"
                >
                  {showManual ? 'Hide' : 'Manual'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {switchError && (
              <div className="mt-3 bg-yellow-500/20 border border-yellow-500 rounded-lg px-4 py-2 text-center">
                <p className="text-yellow-200 text-sm">⚠️ {switchError}</p>
                {isWalletConnect && (
                  <p className="text-yellow-300 text-xs mt-1">
                    📱 Check your wallet app for a pending request
                  </p>
                )}
              </div>
            )}

            {/* Manual Add Section */}
            <AnimatePresence>
              {showManual && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 bg-black/30 rounded-xl p-4">
                    <p className="text-white font-bold mb-3 text-center">📝 Add Network Manually</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="bg-black/40 rounded-lg p-2">
                        <div className="text-gray-400 text-xs">Network Name</div>
                        <div className="text-white font-mono">zkSync Sepolia</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <div className="text-gray-400 text-xs">Chain ID</div>
                        <div className="text-white font-mono">300</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <div className="text-gray-400 text-xs">Symbol</div>
                        <div className="text-white font-mono">ETH</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 col-span-2 md:col-span-1">
                        <div className="text-gray-400 text-xs">RPC URL</div>
                        <button onClick={copyRPC} className="text-yellow-400 font-mono text-xs flex items-center gap-1 hover:text-yellow-300">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Copied!' : 'Copy RPC'}
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <div className="text-gray-400 text-xs">Explorer</div>
                        <a 
                          href="https://sepolia.explorer.zksync.io" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-yellow-400 font-mono text-xs flex items-center gap-1 hover:text-yellow-300"
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <Link 
                        href="/testnet" 
                        className="text-yellow-400 text-sm hover:text-yellow-300 underline"
                      >
                        Need more help? → Full Setup Guide
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
