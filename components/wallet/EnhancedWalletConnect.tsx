"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useChainId, useSwitchChain } from 'wagmi';
import {
  Wallet,
  Check,
  AlertCircle,
  Zap,
  ChevronRight,
  X,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { isMobileDevice } from '@/lib/mobileDetection';
import {
  getWalletPreferences,
  saveWalletPreferences,
  getRecommendedWallet,
  getUserFriendlyError,
  getWalletOnboardingSteps,
  autoSwitchToBaseIfNeeded,
  getWalletStatus,
  PREFERRED_CHAIN,
  PREFERRED_CHAIN_NAME,
  WALLET_RECOMMENDATIONS,
} from '@/lib/wallet/walletUXEnhancements';

interface EnhancedWalletConnectProps {
  onSuccess?: () => void;
  showOnboarding?: boolean;
}

/**
 * Enhanced Wallet Connect with improved UX
 * 
 * Features:
 * - Guided onboarding for new users
 * - Auto-switch to Base network
 * - Clear error messages
 * - Recommended wallet prominently displayed
 * - Mobile-optimized experience
 */
export function EnhancedWalletConnect({ onSuccess, showOnboarding = true }: EnhancedWalletConnectProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error: connectError, isPending } = useConnect({
    mutation: {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        onSuccess?.();
      },
    },
  });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const switchChainFn = switchChain as ((params: { chainId: number }) => Promise<void>) | undefined;

  const [isMobile, setIsMobile] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userError, setUserError] = useState<ReturnType<typeof getUserFriendlyError> | null>(null);
  const [prefs, setPrefs] = useState(getWalletPreferences());

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Show guide for first-time users
  useEffect(() => {
    if (showOnboarding && !prefs.hasSeenWalletGuide && !isConnected) {
      setShowGuide(true);
    }
  }, [showOnboarding, prefs.hasSeenWalletGuide, isConnected]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      const friendlyError = getUserFriendlyError(connectError);
      setUserError(friendlyError);
    }
  }, [connectError]);

  // Auto-switch to Base after connection
  useEffect(() => {
    if (isConnected && switchChainFn && chainId !== PREFERRED_CHAIN.id && prefs.autoSwitchToBase) {
      autoSwitchToBaseIfNeeded(isConnected, chainId, switchChainFn, (error) => {
        // Show error toast if auto-switch fails
        const friendlyError = getUserFriendlyError(error);
        setUserError(friendlyError);
      });
    }
  }, [isConnected, chainId, prefs.autoSwitchToBase, switchChainFn]);

  // Get wallet status
  const _walletStatus = getWalletStatus(isConnected, chainId);
  const onboardingSteps = getWalletOnboardingSteps(isConnected, chainId === PREFERRED_CHAIN.id);

  // Get recommended wallet
  const recommendedWallet = getRecommendedWallet(isMobile);
  const recommendedConnector = connectors.find(c => 
    c.id.includes(recommendedWallet.id) || 
    c.name.toLowerCase().includes(recommendedWallet.name.toLowerCase())
  );

  // Handle wallet connection
  const handleConnect = useCallback((connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      setUserError(null);
      connect({ connector });
      
      // Mark guide as seen
      if (!prefs.hasSeenWalletGuide) {
        const updated = { ...prefs, hasSeenWalletGuide: true };
        setPrefs(updated);
        saveWalletPreferences(updated);
      }
    }
  }, [connectors, connect, prefs]);

  // Handle quick connect (recommended wallet)
  const handleQuickConnect = useCallback(() => {
    if (recommendedConnector) {
      handleConnect(recommendedConnector.id);
    }
  }, [recommendedConnector, handleConnect]);

  // Close guide
  const handleCloseGuide = () => {
    setShowGuide(false);
    const updated = { ...prefs, hasSeenWalletGuide: true };
    setPrefs(updated);
    saveWalletPreferences(updated);
  };

  // If already connected
  if (isConnected) {
    return (
      <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="text-green-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Wallet Connected</h3>
              <p className="text-sm text-zinc-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        {/* Network warning */}
        {chainId !== PREFERRED_CHAIN.id && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-400 mb-2">
                  Wrong Network
                </p>
                <p className="text-xs text-zinc-400 mb-3">
                  VFIDE works on {PREFERRED_CHAIN_NAME}. Switch your network to continue.
                </p>
                <button
                  onClick={() => switchChainFn?.({ chainId: PREFERRED_CHAIN.id })}
                  className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Switch to {PREFERRED_CHAIN_NAME}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Success message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-16 left-0 right-0 flex justify-center z-50"
          >
            <div className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2">
              <Check size={16} />
              <span>Wallet connected successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {userError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400 mb-1">
                  {userError.title}
                </p>
                <p className="text-xs text-zinc-400">{userError.message}</p>
                {userError.learnMoreUrl && (
                  <a
                    href={userError.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Learn more →
                  </a>
                )}
              </div>
              <button
                onClick={() => setUserError(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Choose a wallet to connect to VFIDE on {PREFERRED_CHAIN_NAME}
          </p>
        </div>

        {/* Onboarding steps */}
        {showOnboarding && (
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl">
            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 ${
                    step.completed ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {step.completed ? <Check size={14} /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.completed ? 'text-green-400' : 'text-zinc-300'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-zinc-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended wallet - prominent */}
        {recommendedConnector && (
          <motion.button
            onClick={handleQuickConnect}
            disabled={isConnecting || isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full mb-4 p-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{recommendedWallet.icon}</div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{recommendedWallet.name}</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-cyan-100">{recommendedWallet.description}</p>
                </div>
              </div>
              {(isConnecting || isPending) ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap size={20} />
                </motion.div>
              ) : (
                <ChevronRight size={20} />
              )}
            </div>
          </motion.button>
        )}

        {/* Other wallets */}
        <div>
          <button
            onClick={() => setShowAllWallets(!showAllWallets)}
            className="w-full mb-3 text-sm text-zinc-400 hover:text-zinc-300 flex items-center justify-center gap-2"
          >
            <span>{showAllWallets ? 'Show less' : 'Show all wallets'}</span>
            <motion.div
              animate={{ rotate: showAllWallets ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={16} className="rotate-90" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAllWallets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                {connectors
                  .filter(c => c.id !== recommendedConnector?.id)
                  .map((connector) => {
                    const walletInfo = WALLET_RECOMMENDATIONS.find(
                      w => connector.id.includes(w.id) || connector.name.toLowerCase().includes(w.name.toLowerCase())
                    );

                    return (
                      <button
                        key={connector.id}
                        onClick={() => handleConnect(connector.id)}
                        disabled={isConnecting || isPending}
                        className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{walletInfo?.icon || '🔗'}</span>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{connector.name}</p>
                            {walletInfo && (
                              <p className="text-xs text-zinc-500">{walletInfo.description}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-500" />
                      </button>
                    );
                  })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help link */}
        <button
          onClick={() => setShowGuide(true)}
          className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-400 flex items-center justify-center gap-1"
        >
          <HelpCircle size={14} />
          <span>First time? View connection guide</span>
        </button>
      </div>

      {/* Connection guide modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={handleCloseGuide}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-cyan-400" size={24} />
                  <h3 className="text-xl font-bold text-white">Wallet Connection Guide</h3>
                </div>
                <button
                  onClick={handleCloseGuide}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">What is a wallet?</h4>
                  <p className="text-sm text-zinc-400">
                    A crypto wallet lets you connect to VFIDE and manage your digital assets. Think of it
                    like a digital keychain for web3.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Why {recommendedWallet.name}?</h4>
                  <p className="text-sm text-zinc-400">
                    {isMobile
                      ? "It's the easiest way to connect on mobile - just scan a QR code with your wallet app and you're ready to go!"
                      : "It's the most popular wallet with millions of users. Easy to install and works great with VFIDE."}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">What&apos;s {PREFERRED_CHAIN_NAME}?</h4>
                  <p className="text-sm text-zinc-400">
                    {PREFERRED_CHAIN_NAME} is a fast, low-cost blockchain network that VFIDE uses. After connecting
                    your wallet, you&apos;ll be asked to switch to {PREFERRED_CHAIN_NAME} - it only takes a few seconds!
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button
                    onClick={handleCloseGuide}
                    className="w-full px-4 py-3 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    Got it, let&apos;s connect!
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
