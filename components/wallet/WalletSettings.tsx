"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { 
  Fingerprint, 
  Shield, 
  Link2, 
  Wallet,
  Check,
  X,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';

/**
 * Wallet Settings Panel
 * 
 * Features:
 * - Stay Connected toggle (permanent session)
 * - Biometric login setup (fingerprint/Face ID)
 * - Linked wallets management
 */
export function WalletSettings() {
  const { address, isConnected } = useAccount();
  const { 
    platformSupport, 
    isEnabled: biometricEnabled,
    hasCredentials,
    enroll,
    remove,
    verify,
    linkWallet,
    credentials
  } = useBiometricAuth();
  const { setStayConnected, isStayConnectedEnabled } = useWalletPersistence();
  
  const [stayConnected, setStayConnectedState] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  // Load stay connected setting
  useEffect(() => {
    setStayConnectedState(isStayConnectedEnabled());
  }, [isStayConnectedEnabled]);

  // Toggle stay connected
  const handleStayConnectedChange = (enabled: boolean) => {
    setStayConnectedState(enabled);
    setStayConnected(enabled);
  };

  // Enroll biometric
  const handleEnrollBiometric = async () => {
    if (!address) return;
    
    setIsEnrolling(true);
    try {
      const credential = await enroll('VFIDE Wallet', 'passkey');
      if (credential) {
        linkWallet(address);
      }
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Test biometric
  const handleTestBiometric = async () => {
    setVerifyResult(null);
    const result = await verify();
    setVerifyResult(result);
    setTimeout(() => setVerifyResult(null), 3000);
  };

  // Remove biometric
  const handleRemoveBiometric = async () => {
    const credential = credentials[0];
    if (credential) {
      await remove(credential.id);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-700">
        <div className="flex items-center gap-3 text-zinc-400">
          <AlertCircle size={20} />
          <span>Connect your wallet to access settings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stay Connected */}
      <motion.div 
        className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-lg">
              <Link2 className="text-cyan-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Stay Connected</h3>
              <p className="text-sm text-zinc-400">
                Keep your wallet connected permanently (never expires)
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleStayConnectedChange(!stayConnected)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              stayConnected ? 'bg-cyan-500' : 'bg-zinc-600'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full"
              animate={{ x: stayConnected ? 28 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
        
        {stayConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-cyan-500/10 rounded-lg"
          >
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <Check size={16} />
              <span>Your wallet will stay connected across browser sessions</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Biometric Login */}
      <motion.div 
        className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Fingerprint className="text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Biometric Login</h3>
              <p className="text-sm text-zinc-400">
                Use fingerprint or Face ID to reconnect instantly
              </p>
            </div>
          </div>
          
          {!platformSupport.webauthn ? (
            <span className="px-3 py-1 text-xs bg-zinc-700 text-zinc-400 rounded-full">
              Not Supported
            </span>
          ) : hasCredentials ? (
            <span className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
              Enabled
            </span>
          ) : (
            <span className="px-3 py-1 text-xs bg-zinc-700 text-zinc-400 rounded-full">
              Not Set Up
            </span>
          )}
        </div>

        {platformSupport.webauthn && (
          <div className="mt-4 space-y-3">
            {!hasCredentials ? (
              <button
                onClick={handleEnrollBiometric}
                disabled={isEnrolling}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                {isEnrolling ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Shield size={18} />
                    </motion.div>
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    <span>Set Up Biometric Login</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleTestBiometric}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <Fingerprint size={18} />
                  <span>Test</span>
                  {verifyResult !== null && (
                    verifyResult ? (
                      <Check className="text-green-400" size={18} />
                    ) : (
                      <X className="text-red-400" size={18} />
                    )
                  )}
                </button>
                <button
                  onClick={handleRemoveBiometric}
                  className="px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Current Wallet */}
      <motion.div 
        className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg">
            <Wallet className="text-green-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Connected Wallet</h3>
            <p className="text-sm text-zinc-400 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
