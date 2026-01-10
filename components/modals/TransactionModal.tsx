"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: {
    type: 'send' | 'receive' | 'swap' | 'approve';
    status: 'pending' | 'success' | 'failed';
    hash?: string;
    from?: string;
    to?: string;
    amount?: string;
    token?: string;
  };
}

/**
 * TransactionModal Component
 * Displays transaction details and status
 */
export default function TransactionModal({ 
  isOpen, 
  onClose, 
  transaction 
}: TransactionModalProps) {
  if (!isOpen) return null;

  const getStatusIcon = () => {
    switch (transaction?.status) {
      case 'pending':
        return <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-12 h-12 text-red-400" />;
      default:
        return <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (transaction?.status) {
      case 'pending':
        return 'Transaction Pending';
      case 'success':
        return 'Transaction Successful';
      case 'failed':
        return 'Transaction Failed';
      default:
        return 'Processing Transaction';
    }
  };

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
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Text */}
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            {getStatusText()}
          </h2>

          {/* Transaction Details */}
          {transaction && (
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-[#0F0F14] rounded-lg border border-[#2A2A2F]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Type</span>
                  <span className="text-white font-medium capitalize">
                    {transaction.type}
                  </span>
                </div>
                {transaction.amount && transaction.token && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Amount</span>
                    <span className="text-white font-medium">
                      {transaction.amount} {transaction.token}
                    </span>
                  </div>
                )}
                {transaction.hash && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Hash</span>
                    <a
                      href={`https://etherscan.io/tx/${transaction.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00F0FF] hover:text-[#00D0DF] flex items-center gap-1 text-sm"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-[#00F0FF] text-black rounded-lg font-medium hover:bg-[#00D0DF] transition-colors"
          >
            {transaction?.status === 'success' ? 'Done' : 'Close'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
