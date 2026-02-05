'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Shield, ArrowUpRight } from 'lucide-react';

interface VaultDisplayProps {
  vaultAddress?: string;
  balance?: string;
  className?: string;
}

/**
 * VaultDisplay Component
 * Displays user vault information with balance and actions
 */
export default function VaultDisplay({ 
  vaultAddress, 
  balance = '0', 
  className = '' 
}: VaultDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-gradient-to-br from-zinc-900 to-zinc-900 rounded-xl border border-zinc-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-400/10 rounded-lg">
            <Wallet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Your Vault</h3>
            {vaultAddress && (
              <p className="text-sm text-gray-400">
                {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
              </p>
            )}
          </div>
        </div>
        <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">Total Balance</p>
        <p className="text-3xl font-bold text-white">{balance} VFIDE</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">24h Change</span>
          </div>
          <p className="text-lg font-semibold text-green-400">+0.00%</p>
        </div>
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Security</span>
          </div>
          <p className="text-lg font-semibold text-cyan-400">Active</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors">
          Deposit
        </button>
        <button className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors border border-zinc-700">
          Withdraw
        </button>
      </div>
    </motion.div>
  );
}
