'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { Wallet, TrendingUp, History, LayoutDashboard } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

const TransactionHistory = dynamic(
  () => import('@/components/crypto/TransactionHistory').then((mod) => mod.TransactionHistory),
  { ssr: false }
);

export function ActivityContent() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const formattedBalance = ethBalance
    ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)
    : '0.0000';

  if (!isConnected || !address) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="glass-card-premium p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-violet-500/20 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-accent" />
          </div>
          <div className="badge-live mb-4 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Wallet Required
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your wallet to view balances and transaction history.</p>
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <div className="badge-live mb-3">
            <LayoutDashboard size={12} /> Wallet Overview
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            <span className="bg-gradient-to-r from-white to-accent-light bg-clip-text text-transparent">
              Activity
            </span>
          </h2>
        </div>
        <VfideConnectButton size="md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="analytics-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">ETH Balance</span>
            <Wallet className="w-5 h-5 text-accent" />
          </div>
          <div className="text-white text-3xl font-black mb-1">{formattedBalance}</div>
          <div className="text-gray-400 text-sm">USD conversion unavailable</div>
        </m.div>

        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="analytics-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">VFIDE Tokens</span>
            <Wallet className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-white text-3xl font-black mb-1">0</div>
          <div className="text-gray-400 text-sm">Governance utility</div>
        </m.div>

        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="analytics-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Activity</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-white text-3xl font-black mb-1">Active</div>
          <div className="text-gray-400 text-sm">Governance participant</div>
        </m.div>
      </div>

      <div>
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
  );
}
