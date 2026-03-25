/**
 * Crypto Dashboard Page
 * 
 * Central hub for wallet, payments, and transactions.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, History } from 'lucide-react';
import { WalletButton as _WalletButton } from '@/components/crypto/WalletButton';
import { TransactionHistory } from '@/components/crypto/TransactionHistory';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function CryptoDashboard() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  // Format balance display
  const formattedBalance = ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0.0000';
  const usdValue = null;

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access payments and transaction history.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Crypto Dashboard</h1>
            <p className="text-gray-400">Manage your wallet and payments</p>
          </div>
          <ConnectButton />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">ETH Balance</span>
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">{formattedBalance}</div>
            <div className="text-gray-400 text-sm">
              {usdValue ? `≈ $${usdValue} USD` : 'USD conversion unavailable'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">VFIDE Tokens</span>
              <Wallet className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">0</div>
            <div className="text-gray-400 text-sm">Governance utility</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">Activity</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">Active</div>
            <div className="text-gray-400 text-sm">Governance participant</div>
          </motion.div>
        </div>

        {/* Transactions */}
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-blue-500 text-white">
            <History className="w-4 h-4" />
            <span>Transactions</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <TransactionHistory userId={address} />
        </div>
      </div>
    </div>
  );
}
