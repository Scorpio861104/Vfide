"use client";

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IS_TESTNET, CURRENT_CHAIN_ID } from '@/lib/testnet';
import { safeParseInt } from '@/lib/validation';

const DISMISS_KEY = 'vfide-network-warning-dismissed';
const DISMISS_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Shows a small dismissible warning when user is connected to wrong network
 * Dismissal persists for 1 hour to avoid annoying users
 */
export function NetworkWarning() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  // Use centralized config for expected chain
  const expectedChainId = CURRENT_CHAIN_ID;
  const expectedChain = IS_TESTNET ? baseSepolia : base;
  
  // Check localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < safeParseInt(dismissedUntil, 0)) {
        setDismissed(prev => prev !== true ? true : prev);
      } else {
        setDismissed(prev => prev !== false ? false : prev);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Clear dismissal when user switches to correct chain
  useEffect(() => {
    if (chainId === expectedChainId) {
      localStorage.removeItem(DISMISS_KEY);
      setTimeout(() => {
        setDismissed(prev => prev !== false ? false : prev);
      }, 0);
    }
  }, [chainId, expectedChainId]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION));
  };

  const handleSwitch = () => {
    switchChain({ chainId: expectedChainId as 84532 | 8453 });
  };
  
  // Show warning if connected but on wrong chain (and not dismissed)
  const showWarning = isConnected && chainId !== expectedChainId && !dismissed;

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-[90] max-w-xs"
        >
          <div className="bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg shadow-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 text-sm">
                  Switch to {expectedChain.name}
                </p>
              </div>
              <button
                onClick={handleSwitch}
                disabled={isPending}
                className="text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap"
              >
                {isPending ? '...' : 'Switch'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
