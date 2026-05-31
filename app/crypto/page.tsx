'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, History, LayoutDashboard } from 'lucide-react';
import { WalletButton as _WalletButton } from '@/components/crypto/WalletButton';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

const TransactionHistory = dynamic(
  () => import('@/components/crypto/TransactionHistory').then((mod) => mod.TransactionHistory),
  { ssr: false }
);

export default function CryptoDashboard() {
  const { locale } = useLocale();
  void locale;

  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  const formattedBalance = ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0.0000';
  const usdValue = null;

  if (!isConnected || !address) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
              style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          </div>
          <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex items-center justify-center min-h-[calc(100vh-4.5rem)] p-4">
            <div className="glass-card-premium p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-cyan-300" />
              </div>
              <div className="badge-live mb-4 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Wallet Required
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your wallet to access payments and transaction history.
              </p>
              <VfideConnectButton size="md" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="badge-live mb-3">
                <LayoutDashboard size={12} /> Wallet Overview
              </div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">Crypto Dashboard</span>
              </h1>
              <p className="text-gray-400">Manage your wallet and payments</p>
            </div>
            <VfideConnectButton size="md" />
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="analytics-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">ETH Balance</span>
                <Wallet className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-white text-3xl font-black mb-1">{formattedBalance}</div>
              <div className="text-gray-400 text-sm">
                {usdValue ? `≈ $${usdValue} USD` : 'USD conversion unavailable'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="analytics-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">VFIDE Tokens</span>
                <Wallet className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-white text-3xl font-black mb-1">0</div>
              <div className="text-gray-400 text-sm">Governance utility</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="analytics-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Activity</span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-white text-3xl font-black mb-1">Active</div>
              <div className="text-gray-400 text-sm">Governance participant</div>
            </motion.div>
          </div>

          {/* Transactions */}
          <div className="flex items-center gap-2 mb-4">
            <div className="tab-pill-active flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>Transactions</span>
            </div>
          </div>

          <div className="glass-card-premium p-6">
            <TransactionHistory userId={address} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
