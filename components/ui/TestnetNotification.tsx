"use client";

import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { isTestnetChainId } from '@/lib/chains';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical } from 'lucide-react';

/**
 * Small notification that appears once to inform user they're on testnet
 * Non-intrusive, auto-dismisses after 8 seconds or can be manually dismissed
 */
export function TestnetNotification() {
  const [show, setShow] = useState(false);
  const chainId = useChainId();
  const isTestnet = chainId ? isTestnetChainId(chainId) : false;

  useEffect(() => {
    // Only show on testnet
    if (!isTestnet) return;

    // Check if user has seen this notification in this session
    const hasSeenThisSession = sessionStorage.getItem('testnet-notification-seen');
    if (hasSeenThisSession) return;

    // Show after a short delay
    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem('testnet-notification-seen', 'true');
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => setShow(false), 8000);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isTestnet]);

  if (!isTestnet) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-sm"
        >
          <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-amber-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-300 mb-1">
                  Testnet Mode
                </h3>
                <p className="text-xs text-amber-200/80">
                  You&apos;re on Base Sepolia testnet. All transactions use test ETH (free).
                </p>
              </div>

              <button
                onClick={() => setShow(false)}
                className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
