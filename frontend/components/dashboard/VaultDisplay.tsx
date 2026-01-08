"use client";

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
      className={`p-6 bg-gradient-to-br from-[#1A1A2E] to-[#0F0F14] rounded-xl border border-[#3A3A4F] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
            <Wallet className="w-5 h-5 text-[#00F0FF]" />
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
        <button className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors">
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
        <div className="p-4 bg-[#0A0A0F] rounded-lg border border-[#2A2A2F]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">24h Change</span>
          </div>
          <p className="text-lg font-semibold text-green-400">+0.00%</p>
        </div>
        <div className="p-4 bg-[#0A0A0F] rounded-lg border border-[#2A2A2F]">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#00F0FF]" />
            <span className="text-xs text-gray-400">Security</span>
          </div>
          <p className="text-lg font-semibold text-[#00F0FF]">Active</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button className="px-4 py-2 bg-[#00F0FF] text-black rounded-lg font-medium hover:bg-[#00D0DF] transition-colors">
          Deposit
        </button>
        <button className="px-4 py-2 bg-[#2A2A2F] text-white rounded-lg font-medium hover:bg-[#3A3A4F] transition-colors border border-[#3A3A4F]">
          Withdraw
        </button>
      </div>
    </motion.div>
  );
}
