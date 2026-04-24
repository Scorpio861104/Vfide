'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useVaultHub } from '@/hooks/useVaultHub';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { devLog } from '@/lib/utils';

export function VaultStatusModal() {
  const { address, isConnected } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault, isCreatingVault, createVault, isContractConfigured, isOnCorrectChain, expectedChainId, expectedChainName } = useVaultHub();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [showModal, setShowModal] = useState(false);
  const hasCheckedRef = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // Callback to show modal - called after state check
  const checkAndShowModal = useCallback(() => {
    if (!hasVault) {
      setShowModal(true);
    }
  }, [hasVault]);

  // Check for vault when wallet connects
  useEffect(() => {
    if (isConnected && address && !isLoadingVault && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        checkAndShowModal();
      });
    }
    
    // Reset check when wallet disconnects
    if (!isConnected) {
      hasCheckedRef.current = false;
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        setShowModal(false);
      });
    }
  }, [isConnected, address, isLoadingVault, checkAndShowModal]);

  // Auto-close modal after successful vault creation
  useEffect(() => {
    if (hasVault && isCreating) {
      const timeout = setTimeout(() => {
        setShowModal(false);
        setIsCreating(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [hasVault, isCreating]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal && !isCreatingVault && !isCreating) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [showModal, isCreatingVault, isCreating]);

  const handleCreateVault = async () => {
    try {
      setIsCreating(true);
      await createVault();
      showToast("Vault created successfully!", "success");
      setShowModal(false);
      setIsCreating(false);
    } catch (error) {
      devLog.error('Failed to create vault:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to create vault: ${errorMessage}`, "error");
      setIsCreating(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (!showModal || !isConnected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-2 border-cyan-400 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-cyan-400/20"
        >
          {/* Vault Status Display */}
          {isLoadingVault ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                Checking for Vault...
              </h2>
              <p className="text-zinc-400">
                Looking up your vault address...
              </p>
            </div>
          ) : hasVault ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-emerald-500 mb-2">
                Vault Found!
              </h2>
              <p className="text-zinc-400 mb-4">
                Your existing vault has been detected
              </p>
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6">
                <p className="text-zinc-400 text-xs mb-1">Vault Address:</p>
                <p className="text-cyan-400 font-mono text-sm break-all">
                  {vaultAddress}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 font-bold rounded-lg hover:scale-105 transition-transform"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🏦</span>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-zinc-100 mb-3">
                Welcome to VFIDE!
              </h2>
              
              {/* Subtitle */}
              <p className="text-cyan-400 text-lg font-semibold mb-4">
                No Vault Detected
              </p>

              {/* Explanation */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  <strong className="text-zinc-100">What&apos;s a Vault?</strong>
                  <br />
                  Think of your wallet as an <strong className="text-cyan-400">ATM card</strong> (the key) and your vault as a <strong className="text-cyan-400">bank account</strong> (the safe).
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-zinc-400">Auto-created on first token receipt</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-zinc-400">Only YOUR wallet can unlock it</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-zinc-400">Enhanced security features (freeze, recovery)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-zinc-400">VFIDE can never access your funds</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isOnCorrectChain ? (
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-2">
                    <p className="text-red-500 text-sm mb-3">
                      ⚠️ Please switch to {expectedChainName} network to continue.
                    </p>
                    <button
                      onClick={() => switchChain({ chainId: expectedChainId as 84532 | 8453 })}
                      disabled={isSwitchingChain}
                      className="w-full py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 transition-colors disabled:opacity-50"
                    >
                      {isSwitchingChain ? 'Switching...' : `Switch to ${expectedChainName}`}
                    </button>
                  </div>
                ) : isContractConfigured === false ? (
                  <div className="bg-orange-500/10 border border-orange-500 rounded-lg p-4 mb-2">
                    <p className="text-orange-500 text-sm">
                      ⚠️ Vault system is being configured on this network. Please try again in a few minutes.
                    </p>
                  </div>
                ) : null}
                <button
                  onClick={handleCreateVault}
                  disabled={isCreatingVault || isCreating || isContractConfigured === false || !isOnCorrectChain}
                  className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 font-bold rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isCreatingVault || isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                      Creating Your Vault...
                    </span>
                  ) : (
                    '🏦 Create My Vault (Recommended)'
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3 border-2 border-zinc-700 text-zinc-400 font-semibold rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition-colors"
                >
                  I&apos;ll Create It Later
                </button>
              </div>

              {/* Info Note */}
              <p className="text-zinc-500 text-xs mt-4">
                You can also create your vault automatically by receiving VFIDE tokens
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
