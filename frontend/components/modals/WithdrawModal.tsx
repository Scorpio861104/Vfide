"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpCircle, Wallet, AlertCircle } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw?: (amount: string, token: string, to: string) => Promise<void>;
}

/**
 * WithdrawModal Component
 * Modal for withdrawing tokens from vault
 */
export default function WithdrawModal({ 
  isOpen, 
  onClose, 
  onWithdraw 
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('VFIDE');
  const [toAddress, setToAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0 || !toAddress) return;

    setLoading(true);
    try {
      await onWithdraw?.(amount, token, toAddress);
      setAmount('');
      setToAddress('');
      onClose();
    } catch (error) {
      console.error('Withdraw failed:', error);
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
              <div className="p-2 bg-[#FF6B9D]/10 rounded-lg">
                <ArrowUpCircle className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <h2 className="text-xl font-bold text-white">Withdraw from Vault</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              Withdrawing from your vault will transfer tokens to your wallet. Make sure the recipient address is correct.
            </p>
          </div>

          {/* Token Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Token
            </label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-[#FF6B9D] transition-colors"
            >
              <option value="VFIDE">VFIDE</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white text-lg focus:outline-none focus:border-[#FF6B9D] transition-colors"
              />
              <button
                onClick={() => setAmount('100')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#2A2A2F] text-[#FF6B9D] rounded text-sm hover:bg-[#3A3A4F] transition-colors"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Available: 0 {token}
            </p>
          </div>

          {/* Recipient Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-[#FF6B9D] transition-colors font-mono text-sm"
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F] mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Wallet className="w-4 h-4" />
              <span>Withdrawal Summary</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-medium">{amount || '0'} {token}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-white">~$0.50</span>
              </div>
            </div>
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
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) <= 0 || !toAddress}
              className="px-4 py-3 bg-[#FF6B9D] text-white rounded-lg font-medium hover:bg-[#FF5B8D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
