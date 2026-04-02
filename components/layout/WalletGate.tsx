/**
 * WalletGate — Shared auth guard
 * 
 * Shows connect prompt if wallet not connected.
 * Used in route group layouts so individual pages
 * don't each need their own "Connect Wallet" fallback.
 */
'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

export function WalletGate({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting } = useAccount();

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
        />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access your dashboard, vault, and all VFIDE features.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
