/**
 * Transaction History Component — View all crypto transactions and payments.
 */
'use client';

import React from 'react';
import { useTransactions } from '@/lib/crypto';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { TransactionCard } from './TransactionCard';

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
      return tx.from.toLowerCase().includes(searchLower) || tx.to.toLowerCase().includes(searchLower) || tx.memo?.toLowerCase().includes(searchLower);
    }
    return true;
  });

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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 border-zinc-800 border-t-yellow-500 rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          Transaction History
          {stats.pending > 0 && (
            <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">{stats.pending} pending</motion.span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-sm font-medium">+{stats.totalReceived.toFixed(2)}</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm font-medium">-{stats.totalSent.toFixed(2)}</span>
          </motion.div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) =>  setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          {(['all', 'send', 'receive', 'tip'] as const).map((f) => (
            <motion.button key={f} onClick={() => { setFilter(f); playNotification(); }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-zinc-800'}`}>
              {f === 'all' ? 'All' : f === 'send' ? 'Sent' : f === 'receive' ? 'Received' : 'Tips'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <AnimatePresence mode="popLayout">
        {filteredTransactions.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <FileText className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            </motion.div>
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2">
            {filteredTransactions.map((transaction, index) => (
              <TransactionCard key={transaction.id} transaction={transaction} userId={userId} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
