'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';

import { QuickWalletConnect } from '@/components/wallet/QuickWalletConnect';

export function WalletGate({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting } = useAccount();

  if (isConnecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
        />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Wallet className="h-10 w-10 text-cyan-400" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-6 text-gray-400">
            Connect your wallet to access your dashboard, vault, governance, and other VFIDE features.
          </p>
          <div className="flex justify-center">
            <QuickWalletConnect size="lg" />
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
