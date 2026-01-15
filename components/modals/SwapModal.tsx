"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, ArrowRight } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwap?: (fromToken: string, toToken: string, amount: string) => Promise<void>;
}

/**
 * SwapModal Component
 * Modal for swapping tokens
 */
export default function SwapModal({ 
  isOpen, 
  onClose, 
  onSwap 
}: SwapModalProps) {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('VFIDE');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSwap = async () => {
    if (!amount || safeParseFloat(amount, 0) <= 0) return;

    setLoading(true);
    try {
      await onSwap?.(fromToken, toToken, amount);
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
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
            <h2 className="text-xl font-bold text-white">Swap Tokens</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* From Token */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              From
            </label>
            <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F]">
              <div className="flex items-center justify-between mb-2">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-transparent text-white text-lg font-medium focus:outline-none"
                >
                  <option value="ETH">ETH</option>
                  <option value="VFIDE">VFIDE</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-white text-lg text-right focus:outline-none w-1/2"
                />
              </div>
              <p className="text-xs text-gray-500">Balance: 0 {fromToken}</p>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleFlipTokens}
              className="p-2 bg-[#1A1A2E] border-2 border-[#3A3A4F] rounded-lg hover:border-[#00F0FF] transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-[#00F0FF]" />
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              To
            </label>
            <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F]">
              <div className="flex items-center justify-between mb-2">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="bg-transparent text-white text-lg font-medium focus:outline-none"
                >
                  <option value="VFIDE">VFIDE</option>
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
                <span className="text-white text-lg">
                  {amount ? (safeParseFloat(amount, 0) * 0.95).toFixed(4) : '0.00'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Balance: 0 {toToken}</p>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F] mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Rate</span>
              <span className="text-white">1 {fromToken} = 0.95 {toToken}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Fee (0.3%)</span>
              <span className="text-white">{amount ? (safeParseFloat(amount, 0) * 0.003).toFixed(6) : '0'} {fromToken}</span>
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
              onClick={handleSwap}
              disabled={loading || !amount || safeParseFloat(amount, 0) <= 0 || fromToken === toToken}
              className="px-4 py-3 bg-[#00F0FF] text-black rounded-lg font-medium hover:bg-[#00D0DF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Swapping...' : (
                <>
                  Swap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
