/**
 * WalletGate — Shared auth guard
 * 
 * Shows connect prompt if wallet not connected.
 * Used in route group layouts so individual pages
 * don't each need their own "Connect Wallet" fallback.
 */
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

export function WalletGate({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting } = useAccount();
  const [connectTimedOut, setConnectTimedOut] = useState(false);

  // If wagmi reconnect hangs (RPC down, extension unresponsive), stop
  // spinning after 10 s and fall through to the connect prompt.
  useEffect(() => {
    if (!isConnecting) {
      setConnectTimedOut(false);
      return;
    }
    const t = setTimeout(() => setConnectTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [isConnecting]);

  if (isConnecting && !connectTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent/20 border-t-cyan-500 rounded-full"
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-blue-500/20 border border-accent/30 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect your wallet</h2>
          <p className="text-zinc-400 mb-6">
            Your keys. Your money. Connect a self-custodial wallet — MetaMask, WalletConnect, or Coinbase — to get started. No sign-up or bank account required.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
