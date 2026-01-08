"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownCircle, Wallet } from 'lucide-react';

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
    if (!amount || parseFloat(amount) <= 0) return;

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
          className="relative w-full max-w-md mx-4 p-6 bg-[#1A1A2E] rounded-2xl border border-[#3A3A4F] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
                <ArrowDownCircle className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <h2 className="text-xl font-bold text-white">Deposit to Vault</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
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
              className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
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
                className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white text-lg focus:outline-none focus:border-[#00F0FF] transition-colors"
              />
              <button
                onClick={() => setAmount('100')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#2A2A2F] text-[#00F0FF] rounded text-sm hover:bg-[#3A3A4F] transition-colors"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Available: 0 {token}
            </p>
          </div>

          {/* Balance Info */}
          <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F] mb-6">
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
              className="px-4 py-3 bg-[#2A2A2F] text-white rounded-lg font-medium hover:bg-[#3A3A4F] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="px-4 py-3 bg-[#00F0FF] text-black rounded-lg font-medium hover:bg-[#00D0DF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
