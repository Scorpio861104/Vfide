/**
 * Crypto Dashboard Page
 * 
 * Central hub for wallet, payments, rewards, and transactions.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, History, Award } from 'lucide-react';
import { TransactionHistory } from '@/components/crypto/TransactionHistory';
import { RewardsDisplay } from '@/components/crypto/RewardsDisplay';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function CryptoDashboard() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const [activeTab, setActiveTab] = useState<'transactions' | 'rewards'>('transactions');
  const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Load ETH price for USD conversion
  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        if (!response.ok) throw new Error('Price unavailable');
        const data = await response.json();
        const price = Number(data?.ethereum?.usd);
        if (Number.isFinite(price) && isMounted) {
          setEthPriceUsd(price);
        }
      } catch {
        if (isMounted) {
          setEthPriceUsd(null);
          setPriceError('USD rate unavailable');
        }
      }
    };

    fetchPrice();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format balance display
  const formattedBalance = ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000';
  const usdValue = ethBalance && ethPriceUsd
    ? (parseFloat(ethBalance.formatted) * ethPriceUsd).toFixed(2)
    : null;

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access payments, rewards, and transaction history.
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
            <p className="text-gray-400">Manage your wallet, payments, and rewards</p>
          </div>
          <ConnectButton />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">ETH Balance</span>
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">{formattedBalance}</div>
            <div className="text-gray-400 text-sm">
              {usdValue ? `≈ $${usdValue} USD` : priceError ?? 'USD value unavailable'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">VFIDE Tokens</span>
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">0</div>
            <div className="text-gray-400 text-sm">Community Points</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-linear-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">Activity</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-white text-3xl font-bold mb-1">Active</div>
            <div className="text-gray-400 text-sm">Earning rewards daily</div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'rewards'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Rewards</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {activeTab === 'transactions' && <TransactionHistory userId={address} />}
          {activeTab === 'rewards' && <RewardsDisplay userId={address} />}
        </div>
      </div>
    </div>
  );
}
