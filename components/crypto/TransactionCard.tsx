'use client';

import React from 'react';
import { type Transaction } from '@/lib/crypto';
import { motion } from 'framer-motion';
import { Check, Clock, ExternalLink, FileText, XCircle } from 'lucide-react';
import { shortAddress as formatAddress } from '@/lib/format';
import { renderIconForType, getTransactionLabel, getStatusColor } from './transaction-helpers';
import { useChainId } from 'wagmi';
import { getExplorerLink } from '@/components/ui/EtherscanLink';

interface TransactionCardProps {
  transaction: Transaction;
  userId: string;
  index?: number;
}

// Memoized for list performance
export const TransactionCard = React.memo(function TransactionCard({ transaction, userId, index = 0 }: TransactionCardProps) {
  const chainId = useChainId();
  const isSent = transaction.from.toLowerCase() === userId.toLowerCase();
  const statusColor = getStatusColor(transaction.status);

  // Render status icon based on status
  const renderStatusIcon = () => {
    const iconClass = "w-3 h-3 text-black";
    switch (transaction.status) {
      case 'confirmed':
        return <Check className={iconClass} />;
      case 'pending':
        return <Clock className={iconClass} />;
      case 'failed':
        return <XCircle className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
            isSent
              ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-400'
              : 'bg-gradient-to-br from-green-500/20 to-green-600/10 text-green-400'
          }`}
        >
          {renderIconForType(transaction.type, "w-5 h-5")}
          
          {/* Status indicator */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-zinc-900 ${
              transaction.status === 'confirmed' ? 'bg-green-500' :
              transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          >
            {transaction.status === 'pending' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Clock className="w-3 h-3 text-black" />
              </motion.div>
            ) : (
              renderStatusIcon()
            )}
          </motion.div>
        </motion.div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">
              {getTransactionLabel(transaction.type, isSent)}
            </span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
            >
              {transaction.status}
            </motion.span>
          </div>

          <div className="text-sm text-gray-400 truncate">
            {isSent ? 'To' : 'From'}: <span className="font-mono">{formatAddress(isSent ? transaction.to : transaction.from)}</span>
          </div>

          {transaction.memo && (
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {transaction.memo}
            </div>
          )}

          <div className="text-xs text-gray-600 mt-1">
            {new Date(transaction.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-lg font-bold ${
              isSent ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {isSent ? '-' : '+'}
            {transaction.amount} {transaction.currency}
          </motion.div>
          {transaction.txHash && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              href={getExplorerLink(chainId, transaction.txHash, 'tx')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
            >
              <span>Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Helpers
// ============================================================================

