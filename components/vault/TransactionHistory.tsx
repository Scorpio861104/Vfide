'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Clock,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react';
import { VirtualizedList } from '@/lib/ux/performanceUtils';
import { useChainId } from 'wagmi';
import { getExplorerLink } from '@/components/ui/EtherscanLink';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'vault_deposit' | 'vault_withdraw' | 'guardian_added' | 'guardian_removed' | 'next_of_kin_set' | 'recovery_requested' | 'recovery_approved' | 'recovery_finalized' | 'recovery_cancelled';
  amount?: string;
  from?: string;
  to?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
  blockNumber?: number;
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
  loading?: boolean;
}

export function TransactionHistory({ transactions = [], loading = false }: TransactionHistoryProps) {
  const chainId = useChainId();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (searchTerm && !tx.txHash.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'receive':
        return <ArrowDownLeft size={20} />;
      case 'send':
        return <ArrowUpRight size={20} />;
      case 'vault_deposit':
      case 'vault_withdraw':
        return <Shield size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const getColor = (type: Transaction['type']) => {
    switch (type) {
      case 'receive':
        return 'text-emerald-500';
      case 'send':
        return 'text-red-400';
      case 'vault_deposit':
      case 'vault_withdraw':
        return 'text-blue-500';
      default:
        return 'text-cyan-400';
    }
  };

  const getLabel = (type: Transaction['type']) => {
    const labels: Record<Transaction['type'], string> = {
      send: 'Sent',
      receive: 'Received',
      vault_deposit: 'Vault Deposit',
      vault_withdraw: 'Vault Withdrawal',
      guardian_added: 'Guardian Added',
      guardian_removed: 'Guardian Removed',
      next_of_kin_set: 'Next of Kin Set',
      recovery_requested: 'Recovery Requested',
      recovery_approved: 'Recovery Approved',
      recovery_finalized: 'Recovery Finalized',
      recovery_cancelled: 'Recovery Cancelled',
    };
    return labels[type] || type;
  };

  const shouldVirtualize = filteredTransactions.length > 10;
  const usePerformanceMode = shouldVirtualize && !showFullHistory;

  useEffect(() => {
    if (!shouldVirtualize) {
      setShowFullHistory(false);
    }
  }, [shouldVirtualize]);

  const renderTransactionRow = (tx: Transaction, idx: number, padded = false) => {
    const content = (
      <motion.div
        key={tx.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-cyan-400/50 transition-colors gap-3 sm:gap-0"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className={`p-3 rounded-full ${
            tx.type === 'receive'
              ? 'bg-emerald-500/20'
              : tx.type === 'send'
              ? 'bg-red-400/20'
              : tx.type.includes('vault')
              ? 'bg-blue-500/20'
              : 'bg-cyan-400/20'
          } ${getColor(tx.type)}`}>
            {getIcon(tx.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-zinc-100 font-bold truncate">
              {getLabel(tx.type)}
            </div>
            {tx.amount && (
              <div className={`font-bold text-sm ${getColor(tx.type)}`}>
                {tx.amount}
              </div>
            )}
            {(tx.from || tx.to) && (
              <div className="text-zinc-400 text-sm truncate">
                {tx.from ? `From ${tx.from}` : `To ${tx.to}`}
              </div>
            )}
            <div className="text-zinc-400 text-xs mt-1 flex items-center gap-2">
              <Clock size={12} />
              {tx.timestamp}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className={`px-3 py-1 rounded text-xs font-bold ${
            tx.status === 'completed'
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-500'
              : tx.status === 'pending'
              ? 'bg-orange-500/20 border border-orange-500 text-orange-500'
              : 'bg-red-600/20 border border-red-600 text-red-600'
          }`}>
            {tx.status}
          </div>
          <a 
            href={getExplorerLink(chainId, tx.txHash, 'tx')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-400 transition-colors flex items-center gap-1 text-xs"
          >
            View
            <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    );

    return padded ? <div className="h-full pb-3">{content}</div> : content;
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-zinc-100">
            Transaction History
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
             
              value={searchTerm}
              onChange={(e) =>  setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm w-full sm:w-48"
            />
          </div>
          
          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <select
              value={filter}
              onChange={(e) =>  setFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm appearance-none cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Types</option>
              <option value="send">Sent</option>
              <option value="receive">Received</option>
              <option value="vault_deposit">Vault</option>
              <option value="guardian_added">Guardians</option>
              <option value="recovery_requested">Recovery</option>
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-zinc-400 text-sm">No transactions found</div>
        </div>
      ) : usePerformanceMode ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
            Performance mode active — long transaction histories are windowed for smoother scrolling.
          </div>
          <VirtualizedList
            items={filteredTransactions}
            itemHeight={124}
            containerHeight={Math.min(filteredTransactions.length * 124, 420)}
            className="pr-2"
            keyExtractor={(tx) => tx.id}
            renderItem={(tx, idx) => renderTransactionRow(tx, idx, true)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx, idx) => renderTransactionRow(tx, idx))}
        </div>
      )}
      
      {filteredTransactions.length > 0 && (
        <div className="mt-4 text-center">
          {shouldVirtualize ? (
            <button
              type="button"
              onClick={() => setShowFullHistory((prev) => !prev)}
              className="text-cyan-400 text-sm hover:underline"
            >
              {usePerformanceMode ? 'Show full list →' : 'Use performance mode →'}
            </button>
          ) : (
            <span className="text-zinc-400 text-sm">
              Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
