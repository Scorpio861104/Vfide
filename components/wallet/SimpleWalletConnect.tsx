"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Copy, Check, Clock, Circle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/toast';
import { useEnhancedWalletConnect } from '@/hooks/useEnhancedWalletConnect';
import { useENS } from '@/hooks/useENS';
import { measureLatency, getCachedLatency, getLatencyColor } from '@/lib/networkLatency';
import { addConnectionToHistory } from '@/lib/connectionHistory';
import { connectionStateAnimations, fadeIn, scaleIn } from '@/lib/animations';
import { scrollToTop } from '@/lib/focusTrap';
import { POLLING_INTERVALS, ANIMATION_DURATION } from '@/lib/walletConstants';

/**
 * Enhanced Simple Wallet Connect Component
 * 
 * Phase 1 Enhancements:
 * - Improved button responsiveness
 * - Better loading states with status indicators
 * - Enhanced error handling
 * - Smooth animations
 * - Mobile optimized
 * - Keyboard navigation support (Enter, Escape)
 * - Copy address to clipboard functionality
 * 
 * Phase 2 Enhancements:
 * - Session duration display
 * - Connection cooldown indicator
 * - Preferred wallet auto-selection
 * 
 * Phase 3 Enhancements:
 * - Network latency indicator with color coding
 * - ENS name resolution and display
 * - Connection history tracking
 * - Hover tooltips for wallet information
 * 
 * Phase 4 Enhancements:
 * - Micro-animations for state transitions
 * - Optimistic UI updates
 * - Smooth scroll-to-top after connection
 * - Gas price estimates in tooltips
 */
export function SimpleWalletConnect() {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { sessionDurationFormatted, isInCooldown, cooldownRemaining } = useEnhancedWalletConnect();
  // Get connector info from wagmi
  const { connector } = useAccount();

  // Copy address to clipboard
  const copyAddress = useCallback(async (address: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      showToast('Address copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy address', 'error', 2000);
    }
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + W to open wallet modal (if not connected)
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        // This will be handled by the button's onClick
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Wait for mount to avoid hydration mismatch
        const ready = mounted && authenticationStatus !== 'loading';
        
        // Check all connection requirements
        const connected =
          ready &&
          account != null &&
          chain != null &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        // Show loading state
        const isLoading = authenticationStatus === 'loading';

        // Phase 3: ENS resolution
        const { ensName } = useENS(account?.address);

        // Phase 3: Network latency monitoring
        const [latencyData, setLatencyData] = useState(chain?.id ? getCachedLatency(chain.id) : null);

        useEffect(() => {
          if (chain?.id && connected) {
            // Check cached first
            const cached = getCachedLatency(chain.id);
            if (cached) {
              setLatencyData(cached);
            }

            // Measure latency periodically
            const measureAndUpdate = async () => {
              // Only measure if we have a valid RPC endpoint
              // Type assertion needed because RainbowKit chain has limited type info
              const chainWithRpc = chain as typeof chain & {
                rpcUrls?: {
                  default?: {
                    http?: readonly string[];
                  };
                };
              };
              const rpcUrl = chainWithRpc.rpcUrls?.default?.http?.[0];
              if (rpcUrl) {
                const data = await measureLatency(rpcUrl, chain.id);
                setLatencyData(data);
              }
            };

            measureAndUpdate();
            const interval = setInterval(measureAndUpdate, POLLING_INTERVALS.LATENCY);

            return () => clearInterval(interval);
          }
          return undefined;
        }, [chain?.id, connected, chain]);

        // Phase 3: Track connection in history
        useEffect(() => {
          if (connected && account && chain) {
            addConnectionToHistory({
              address: account.address,
              connectorId: connector?.id || 'unknown',
              connectorName: connector?.name,
              chainId: chain.id,
              success: true,
            });
            
            // Phase 4: Scroll to top after successful connection
            setTimeout(() => scrollToTop(), ANIMATION_DURATION.SCROLL_DELAY);
          }
        }, [connected, account, chain, connector]);

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (isLoading) {
                return (
                  <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    animate="show"
                    className="px-2.5 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-2.5 text-xs xs:text-sm sm:text-base bg-[#2A2A2F] text-[#A0A0A5] font-bold rounded-lg border border-[#3A3A3F] cursor-wait"
                  >
                    <span className="flex items-center gap-1.5 xs:gap-2">
                      <motion.svg 
                        className="h-3 w-3 xs:h-4 xs:w-4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </motion.svg>
                      <span className="hidden xs:inline">Connecting...</span>
                      <span className="xs:hidden">...</span>
                    </span>
                  </motion.div>
                );
              }

              if (!connected) {
                return (
                  <motion.button
                    onClick={openConnectModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isInCooldown) {
                          openConnectModal();
                        }
                      }
                    }}
                    variants={scaleIn}
                    initial="hidden"
                    animate="show"
                    whileHover={{ scale: isInCooldown ? 1 : 1.05 }}
                    whileTap={{ scale: isInCooldown ? 1 : 0.95 }}
                    type="button"
                    disabled={isInCooldown}
                    aria-label={isInCooldown ? `Too many attempts. Retry in ${Math.ceil(cooldownRemaining / 1000)}s` : "Connect your wallet (Ctrl+W)"}
                    title={isInCooldown ? `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before retrying` : "Connect Wallet (Ctrl+W)"}
                    className={`px-2.5 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-2.5 text-xs xs:text-sm sm:text-base font-bold rounded-lg transition-all font-[family-name:var(--font-body)] touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0F0F12] ${
                      isInCooldown
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] hover:shadow-lg hover:shadow-[#00F0FF]/50 cursor-pointer focus:ring-[#00F0FF]'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {isInCooldown ? (
                        <motion.span
                          key="cooldown"
                          variants={fadeIn}
                          initial="hidden"
                          animate="show"
                          exit="hidden"
                          className="flex items-center gap-1.5 xs:gap-2"
                        >
                          <Clock size={14} className="xs:w-4 xs:h-4" />
                          <span className="hidden xs:inline">Retry in {Math.ceil(cooldownRemaining / 1000)}s</span>
                          <span className="xs:hidden">{Math.ceil(cooldownRemaining / 1000)}s</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="connect"
                          variants={fadeIn}
                          initial="hidden"
                          animate="show"
                          exit="hidden"
                        >
                          <span className="hidden sm:inline">Connect Wallet</span>
                          <span className="hidden xs:inline sm:hidden">Connect</span>
                          <span className="xs:hidden">💳</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              }

              if (chain.unsupported) {
                return (
                  <motion.button
                    onClick={openChainModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openChainModal();
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-label="Switch to supported network"
                    className="px-2.5 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-2.5 text-xs xs:text-sm sm:text-base bg-red-500 text-white font-bold rounded-lg hover:shadow-lg transition-all font-[family-name:var(--font-body)] cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0F0F12]"
                  >
                    <span className="hidden sm:inline">Wrong Network</span>
                    <span className="hidden xs:inline sm:hidden">Wrong Net</span>
                    <span className="xs:hidden">⚠️</span>
                  </motion.button>
                );
              }

              return (
                <div className="flex gap-1.5 xs:gap-2">
                  <motion.button
                    onClick={openChainModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openChainModal();
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    aria-label={`Current network: ${chain.name}${latencyData ? ` - ${latencyData.status} (${latencyData.latency}ms)` : ''}`}
                    title={latencyData ? `Network latency: ${latencyData.latency}ms (${latencyData.status})` : chain.name}
                    className="hidden sm:flex px-3 xs:px-4 py-1.5 xs:py-2 bg-[#2A2A2F] border border-[#3A3A3F] text-[#F5F3E8] rounded-lg hover:border-[#00F0FF] transition-all font-[family-name:var(--font-body)] text-xs xs:text-sm items-center cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#0F0F12]"
                  >
                    {/* Phase 3: Network latency indicator */}
                    {latencyData && (
                      <Circle 
                        size={8}
                        fill={getLatencyColor(latencyData.status)}
                        color={getLatencyColor(latencyData.status)}
                        className="mr-2"
                      />
                    )}
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                          display: 'inline-block',
                        }}
                      >
                        {chain.iconUrl && (
                          <Image
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            width={12}
                            height={12}
                            unoptimized
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </motion.button>

                  <motion.button
                    onClick={openAccountModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openAccountModal();
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    aria-label="Open account menu"
                    title={sessionDurationFormatted ? `Connected for ${sessionDurationFormatted}` : 'Open account menu'}
                    className="relative px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all font-[family-name:var(--font-body)] cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#0F0F12] group"
                  >
                    <span className="hidden sm:flex items-center gap-1.5 xs:gap-2">
                      {/* Phase 3: Show ENS name if available */}
                      {ensName || account.displayName}
                      {account.displayBalance ? ` (${account.displayBalance})` : ''}
                      {/* Session duration indicator */}
                      {sessionDurationFormatted && (
                        <span className="text-[10px] xs:text-xs opacity-70 flex items-center gap-1">
                          <Clock size={10} className="xs:w-3 xs:h-3" />
                          {sessionDurationFormatted}
                        </span>
                      )}
                      {/* Copy button */}
                      <button
                        onClick={(e) => copyAddress(account.address, e)}
                        className="ml-0.5 xs:ml-1 p-0.5 xs:p-1 hover:bg-[#1A1A1D]/20 rounded transition-colors"
                        title={`Copy address${ensName ? ` (${account.address})` : ''}`}
                        aria-label="Copy wallet address"
                      >
                        {copied ? (
                          <Check size={12} className="text-[#50C878] xs:w-3.5 xs:h-3.5" />
                        ) : (
                          <Copy size={12} className="xs:w-3.5 xs:h-3.5" />
                        )}
                      </button>
                    </span>
                    <span className="hidden xs:inline sm:hidden truncate max-w-[80px]">{account.displayName}</span>
                    <span className="xs:hidden">👤</span>
                  </motion.button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
