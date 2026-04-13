'use client';

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
  const [txError, setTxError] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!amount || safeParseFloat(amount, 0) <= 0) return;

    setLoading(true);
    setTxError(null);
    try {
      await onSwap?.(fromToken, toToken, amount);
      setAmount('');
      onClose();
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Swap failed. Please verify token balances and slippage settings, then try again.');
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
          className="relative w-full max-w-md mx-4 p-6 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Swap Tokens</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* From Token */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              From
            </label>
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <select
                  value={fromToken}
                  onChange={(e) =>  setFromToken(e.target.value)}
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
                  onChange={(e) =>  setAmount(e.target.value)}
                 
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
              className="p-2 bg-zinc-900 border-2 border-zinc-700 rounded-lg hover:border-cyan-400 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              To
            </label>
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <select
                  value={toToken}
                  onChange={(e) =>  setToToken(e.target.value)}
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
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Rate</span>
              <span className="text-white">1 {fromToken} = 0.95 {toToken}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Fee (0.3%)</span>
              <span className="text-white">{amount ? (safeParseFloat(amount, 0) * 0.003).toFixed(6) : '0'} {fromToken}</span>
            </div>
          </div>

          {/* Error Display */}
          {txError && (
            <div className="p-3 bg-red-900/20 border border-red-500/40 rounded-lg mb-6 text-sm text-red-300">
              {txError}
            </div>
          )}

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
              onClick={handleSwap}
              disabled={loading || !amount || safeParseFloat(amount, 0) <= 0 || fromToken === toToken}
              className="px-4 py-3 bg-cyan-400 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
