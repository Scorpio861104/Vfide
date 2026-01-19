/**
 * Transaction History Component
 * 
 * View all crypto transactions and payments.
 */

'use client';

import React from 'react';
import { Transaction, useTransactions } from '@/lib/crypto';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    FileText,
    Gift,
    Search,
    Users,
    Check,
    Clock,
    XCircle,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface TransactionHistoryProps {
  userId: string;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const { transactions, loading } = useTransactions(userId);
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'tip'>('all');
  const [search, setSearch] = useState('');
  const { playNotification } = useTransactionSounds();

  const filteredTransactions = transactions.filter((tx) => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        tx.from.toLowerCase().includes(searchLower) ||
        tx.to.toLowerCase().includes(searchLower) ||
        tx.memo?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Calculate stats
  const stats = useMemo(() => {
    const sent = transactions.filter(tx => tx.from.toLowerCase() === userId.toLowerCase());
    const received = transactions.filter(tx => tx.to.toLowerCase() === userId.toLowerCase());
    return {
      totalSent: sent.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
      totalReceived: received.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
      pending: transactions.filter(tx => tx.status === 'pending').length,
    };
  }, [transactions, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-[#2A2A2F] border-t-yellow-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Transaction History
            {stats.pending > 0 && (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full"
              >
                {stats.pending} pending
              </motion.span>
            )}
          </h2>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2"
          >
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-sm font-medium">+{stats.totalReceived.toFixed(2)}</span>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm font-medium">-{stats.totalSent.toFixed(2)}</span>
          </motion.div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or memo..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl">
          {(['all', 'send', 'receive', 'tip'] as const).map((f) => (
            <motion.button
              key={f}
              onClick={() => {
                setFilter(f);
                playNotification();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-yellow-500 text-black' 
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2F]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'send' ? 'Sent' : f === 'receive' ? 'Received' : 'Tips'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <AnimatePresence mode="popLayout">
        {filteredTransactions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-12 text-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FileText className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            </motion.div>
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2">
            {filteredTransactions.map((transaction, index) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                userId={userId}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Transaction Card
// ============================================================================

interface TransactionCardProps {
  transaction: Transaction;
  userId: string;
  index?: number;
}

// Memoized for list performance
const TransactionCard = React.memo(function TransactionCard({ transaction, userId, index = 0 }: TransactionCardProps) {
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
      className="bg-[#1A1A1F] border border-[#2A2A2F] hover:border-[#3A3A3F] rounded-xl p-4 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
            isSent
              ? 'bg-linear-to-br from-red-500/20 to-red-600/10 text-red-400'
              : 'bg-linear-to-br from-green-500/20 to-green-600/10 text-green-400'
          }`}
        >
          {renderIconForType(transaction.type, "w-5 h-5")}
          
          {/* Status indicator */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-[#1A1A1F] ${
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
              href={`https://etherscan.io/tx/${transaction.txHash}`}
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

function renderIconForType(type: Transaction['type'], className: string) {
  switch (type) {
    case 'send':
      return <ArrowUpRight className={className} />;
    case 'receive':
      return <ArrowDownLeft className={className} />;
    case 'tip':
      return <Gift className={className} />;
    case 'payment_request':
      return <FileText className={className} />;
    case 'group_payment':
      return <Users className={className} />;
    default:
      return <ArrowUpRight className={className} />;
  }
}

function _getStatusIcon(status: Transaction['status']) {
  switch (status) {
    case 'confirmed':
      return Check;
    case 'pending':
      return Clock;
    case 'failed':
      return XCircle;
    default:
      return Clock;
  }
}

function getTransactionLabel(type: Transaction['type'], isSent: boolean): string {
  switch (type) {
    case 'tip':
      return isSent ? 'Tip Sent' : 'Tip Received';
    case 'payment_request':
      return 'Payment Request';
    case 'group_payment':
      return 'Group Payment';
    default:
      return isSent ? 'Sent' : 'Received';
  }
}

function getStatusColor(status: Transaction['status']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500/10 text-green-400';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'failed':
      return 'bg-red-500/10 text-red-400';
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
