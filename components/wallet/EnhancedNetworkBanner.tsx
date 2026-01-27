'use client';
import { log } from '@/lib/logging';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { AlertCircle, X, Zap, Check } from 'lucide-react';
import {
  getWalletPreferences,
  saveWalletPreferences,
  getNetworkSwitchGuide,
  PREFERRED_CHAIN,
  PREFERRED_CHAIN_NAME,
} from '@/lib/wallet/walletUXEnhancements';

/**
 * Enhanced Network Switch Banner
 * 
 * Features:
 * - Prominent, non-dismissible until user switches
 * - Clear step-by-step guidance
 * - One-click switch button
 * - Progress indication
 * - User-friendly error messages
 */
export function EnhancedNetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, isSuccess, error } = useSwitchChain();

  const [showBanner, setShowBanner] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [prefs, setPrefs] = useState(getWalletPreferences());

  const isWrongNetwork = isConnected && chainId !== PREFERRED_CHAIN.id;
  const guide = getNetworkSwitchGuide(chainId);

  // Show banner when on wrong network
  useEffect(() => {
    if (isWrongNetwork && !prefs.dismissedWrongNetworkWarning) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [isWrongNetwork, prefs.dismissedWrongNetworkWarning]);

  // Hide banner after successful switch
  useEffect(() => {
    if (isSuccess) {
      setShowBanner(false);
    }
  }, [isSuccess]);

  // Handle switch
  const handleSwitch = () => {
    switchChain({ chainId: PREFERRED_CHAIN.id });
  };

  // Handle dismiss (user wants to stay on wrong network)
  const handleDismiss = () => {
    const updated = { ...prefs, dismissedWrongNetworkWarning: true };
    setPrefs(updated);
    saveWalletPreferences(updated);
    setShowBanner(false);
  };

  if (!showBanner || !isWrongNetwork) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Message */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm md:text-base">
                  Wrong Network Detected
                </h3>
                <p className="text-white/90 text-xs md:text-sm">
                  VFIDE works on {PREFERRED_CHAIN_NAME}. Please switch your network to continue.
                </p>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Show steps button */}
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs md:text-sm rounded-lg transition-colors"
              >
                {showSteps ? 'Hide' : 'How?'}
              </button>

              {/* Switch button */}
              <button
                onClick={handleSwitch}
                disabled={isPending}
                className="px-4 py-2 bg-white text-orange-600 font-semibold text-sm md:text-base rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap size={16} />
                    </motion.div>
                    <span>Switching...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Switch Network</span>
                  </>
                )}
              </button>

              {/* Dismiss button (small) */}
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                title="Dismiss (not recommended)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-white/10 rounded-lg"
            >
              <p className="text-white text-sm">
                ❌ {error.message || 'Failed to switch network. Please try manually in your wallet.'}
              </p>
            </motion.div>
          )}

          {/* Step-by-step guide */}
          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm"
              >
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>{guide.title}</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                    ~{guide.estimatedTime}
                  </span>
                </h4>
                <ol className="space-y-2">
                  {guide.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3 text-white/90 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact Network Switch Widget (for in-page use)
 */
export function NetworkSwitchWidget() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== PREFERRED_CHAIN.id;

  if (!isWrongNetwork) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <Check size={16} className="text-green-400" />
        <span className="text-sm text-green-400">On {PREFERRED_CHAIN_NAME}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg"
    >
      <AlertCircle size={16} className="text-orange-400" />
      <span className="text-sm text-orange-400">Wrong network</span>
      <button
        onClick={() => switchChain({ chainId: PREFERRED_CHAIN.id })}
        disabled={isPending}
        className="ml-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Switching...' : 'Fix'}
      </button>
    </motion.div>
  );
}
