/**
 * Transaction History Component
 * 
 * View all crypto transactions and payments.
 */

'use client';

import { Transaction, useTransactions } from '@/lib/crypto';
import { motion } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    FileText,
    Gift,
    Search,
    Users
} from 'lucide-react';
import { useState } from 'react';

interface TransactionHistoryProps {
  userId: string;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const { transactions, loading } = useTransactions(userId);
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'tip'>('all');
  const [search, setSearch] = useState('');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-2 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All</option>
            <option value="send">Sent</option>
            <option value="receive">Received</option>
            <option value="tip">Tips</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Transaction Card
// ============================================================================

interface TransactionCardProps {
  transaction: Transaction;
  userId: string;
}

function TransactionCard({ transaction, userId }: TransactionCardProps) {
  const isSent = transaction.from.toLowerCase() === userId.toLowerCase();
  const Icon = getIconForType(transaction.type);
  const statusColor = getStatusColor(transaction.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A1F] border border-[#2A2A2F] hover:border-[#3A3A3F] rounded-lg p-4 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isSent
              ? 'bg-red-500/10 text-red-400'
              : 'bg-green-500/10 text-green-400'
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">
              {getTransactionLabel(transaction.type, isSent)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
            >
              {transaction.status}
            </span>
          </div>

          <div className="text-sm text-gray-400 truncate">
            {isSent ? (<>To</>) : (<>From</>)}: {formatAddress(isSent ? transaction.to : transaction.from)}
          </div>

          {transaction.memo && (
            <div className="text-sm text-gray-500 mt-1">{transaction.memo}</div>
          )}

          <div className="text-xs text-gray-600 mt-1">
            {new Date(transaction.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <div
            className={`text-lg font-bold ${
              isSent ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {isSent ? '-' : '+'}
            {transaction.amount} {transaction.currency}
          </div>
          {transaction.txHash && (
            <a
              href={`https://etherscan.io/tx/${transaction.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
            >
              <span>View on Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getIconForType(type: Transaction['type']) {
  switch (type) {
    case 'send':
      return ArrowUpRight;
    case 'receive':
      return ArrowDownLeft;
    case 'tip':
      return Gift;
    case 'payment_request':
      return FileText;
    case 'group_payment':
      return Users;
    default:
      return ArrowUpRight;
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
