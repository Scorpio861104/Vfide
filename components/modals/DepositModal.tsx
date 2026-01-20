"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownCircle, Wallet } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit?: (amount: string, token: string) => Promise<void>;
}

/**
 * DepositModal Component
 * Modal for depositing tokens into vault
 */
export default function DepositModal({ 
  isOpen, 
  onClose, 
  onDeposit 
}: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('VFIDE');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount || safeParseFloat(amount, 0) <= 0) return;

    setLoading(true);
    try {
      await onDeposit?.(amount, token);
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Deposit failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md mx-4 p-6 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-400/10 rounded-lg">
                <ArrowDownCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Deposit to Vault</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Token Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Token
            </label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
            >
              <option value="VFIDE">VFIDE</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-lg focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <button
                onClick={() => setAmount('100')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-zinc-800 text-cyan-400 rounded text-sm hover:bg-zinc-700 transition-colors"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Available: 0 {token}
            </p>
          </div>

          {/* Balance Info */}
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Wallet className="w-4 h-4" />
              <span>After Deposit</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {amount || '0'} {token}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              disabled={loading || !amount || safeParseFloat(amount, 0) <= 0}
              className="px-4 py-3 bg-cyan-400 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
