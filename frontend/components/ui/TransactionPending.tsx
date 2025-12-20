"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useChainId } from 'wagmi';

type TransactionStatus = 'pending' | 'confirming' | 'success' | 'error';

interface TransactionPendingProps {
  isOpen: boolean;
  status: TransactionStatus;
  hash?: string;
  title?: string;
  message?: string;
  onClose?: () => void;
}

const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  137: 'https://polygonscan.com',
  42161: 'https://arbiscan.io',
};

/**
 * Full-screen transaction pending overlay
 */
export function TransactionPending({
  isOpen,
  status,
  hash,
  title,
  message,
  onClose,
}: TransactionPendingProps) {
  const chainId = useChainId();
  const explorerUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[11155111];

  const statusConfig = {
    pending: {
      icon: <Loader2 className="animate-spin text-[#00F0FF]" size={48} />,
      title: title || 'Confirm in Wallet',
      message: message || 'Please confirm the transaction in your wallet...',
      color: '#00F0FF',
    },
    confirming: {
      icon: <Loader2 className="animate-spin text-yellow-400" size={48} />,
      title: title || 'Transaction Pending',
      message: message || 'Waiting for blockchain confirmation...',
      color: '#FBBF24',
    },
    success: {
      icon: <CheckCircle2 className="text-green-400" size={48} />,
      title: title || 'Transaction Successful!',
      message: message || 'Your transaction has been confirmed.',
      color: '#4ADE80',
    },
    error: {
      icon: <XCircle className="text-red-400" size={48} />,
      title: title || 'Transaction Failed',
      message: message || 'Something went wrong. Please try again.',
      color: '#F87171',
    },
  };

  const config = statusConfig[status];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={status === 'success' || status === 'error' ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1A1A1D] border border-[#2A2A2F] rounded-2xl p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              {config.icon}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">
              {config.title}
            </h2>

            {/* Message */}
            <p className="text-[#A0A0A5] mb-6">
              {config.message}
            </p>

            {/* Transaction Hash Link */}
            {hash && (
              <a
                href={`${explorerUrl}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#00F0FF] hover:text-[#00D4FF] transition-colors mb-6"
              >
                <span className="font-mono text-sm">
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </span>
                <ExternalLink size={14} />
              </a>
            )}

            {/* Progress indicator for pending/confirming */}
            {(status === 'pending' || status === 'confirming') && (
              <div className="w-full bg-[#2A2A2F] rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: '0%' }}
                  animate={{ width: status === 'confirming' ? '70%' : '30%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}

            {/* Close button for final states */}
            {(status === 'success' || status === 'error') && onClose && (
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-[#2A2A2F] border border-[#3A3A3F] text-[#F5F3E8] rounded-lg hover:border-[#00F0FF] transition-colors"
              >
                Close
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook-friendly transaction status tracker
 */
export function useTransactionStatus() {
  // This would integrate with wagmi's useWaitForTransactionReceipt
  // Returns status based on isPending, isConfirming, isSuccess, isError
}
