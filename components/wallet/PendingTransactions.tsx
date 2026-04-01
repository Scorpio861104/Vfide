'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useChainId } from 'wagmi';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { getEthereumProvider, requestEthereum } from '@/lib/ethereumProvider';
import { IS_TESTNET } from '@/lib/chains';
import { logger } from '@/lib/logger';
import { safeLocalStorage } from '@/lib/utils';

/**
 * Pending Transactions List Component
 * 
 * Shows recent and pending transactions for the connected wallet
 * Features:
 * - Real-time pending transaction tracking
 * - Recent transaction history
 * - Transaction status indicators
 * - Quick links to explorer
 */

interface Transaction {
  hash: string;
  type: 'send' | 'receive' | 'contract' | 'swap';
  status: 'pending' | 'confirmed' | 'failed';
  amount?: string;
  symbol?: string;
  to?: string;
  from?: string;
  timestamp: number;
  gasUsed?: string;
  chainId: number;
}

interface EthereumReceipt {
  status?: string;
  gasUsed?: string;
}

const STORAGE_KEY = 'vfide-pending-txs';
const MAX_TRANSACTIONS = 10;

function asEthereumReceipt(value: unknown): EthereumReceipt | null {
  if (value === null) return null;
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid transaction receipt from provider');
  }

  const receipt = value as { status?: unknown; gasUsed?: unknown };
  return {
    status: typeof receipt.status === 'string' ? receipt.status : undefined,
    gasUsed: typeof receipt.gasUsed === 'string' ? receipt.gasUsed : undefined,
  };
}

export function usePendingTransactions() {
  const { address } = useAccount();
  const _chainId = useChainId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Load from storage
  useEffect(() => {
    if (!address) return;
    
    try {
      const stored = safeLocalStorage.getItem(`${STORAGE_KEY}-${address}`);
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, [address]);

  // Save to storage
  useEffect(() => {
    if (!address || transactions.length === 0) return;
    
    try {
      safeLocalStorage.setItem(`${STORAGE_KEY}-${address}`, JSON.stringify(transactions));
    } catch {
      // Ignore storage errors
    }
  }, [transactions, address]);

  // Add transaction
  const addTransaction = (tx: Omit<Transaction, 'timestamp'>) => {
    setTransactions(prev => {
      const updated = [
        { ...tx, timestamp: Date.now() },
        ...prev.filter(t => t.hash !== tx.hash),
      ].slice(0, MAX_TRANSACTIONS);
      return updated;
    });
  };

  // Update transaction status
  const updateTransaction = (hash: string, updates: Partial<Transaction>) => {
    setTransactions(prev => 
      prev.map(tx => tx.hash === hash ? { ...tx, ...updates } : tx)
    );
  };

  // Poll for pending transaction status
  const pollTransaction = async (hash: string, txHash: string, txChainId: number) => {
    const provider = getEthereumProvider();
    if (!provider) return;
    
    setIsPolling(true);
    
    try {
      const receipt = await requestEthereum(provider, {
        method: 'eth_getTransactionReceipt',
        params: [hash],
      }, asEthereumReceipt);
      
      if (receipt) {
        const status = receipt.status === '0x1' ? 'confirmed' : 'failed';
        updateTransaction(hash, { 
          status,
          gasUsed: receipt.gasUsed,
        });
      }
    } catch (err) {
      logger.error('Failed to poll transaction', err, { hash: txHash, chainId: txChainId });
    } finally {
      setIsPolling(false);
    }
  };

  // Poll all pending transactions
  useEffect(() => {
    const pending = transactions.filter(tx => tx.status === 'pending');
    if (pending.length === 0) return;

    const interval = setInterval(() => {
      pending.forEach(tx => pollTransaction(tx.hash, tx.hash, tx.chainId));
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [transactions]);

  // Get pending count
  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;

  // Clear all transactions
  const clearAll = () => {
    setTransactions([]);
    if (address) {
      safeLocalStorage.removeItem(`${STORAGE_KEY}-${address}`);
    }
  };

  return {
    transactions,
    pendingCount,
    isPolling,
    addTransaction,
    updateTransaction,
    clearAll,
  };
}

/**
 * Pending transactions dropdown for wallet
 */
interface PendingTransactionsListProps {
  maxItems?: number;
  compact?: boolean;
}

export function PendingTransactionsList({ maxItems = 5, compact = false }: PendingTransactionsListProps) {
  const { address } = useAccount();
  const _chainId = useChainId();
  const { transactions, pendingCount, isPolling } = usePendingTransactions();
  
  const explorerUrl = IS_TESTNET 
    ? 'https://sepolia.basescan.org' 
    : 'https://basescan.org';

  const displayTxs = transactions.slice(0, maxItems);

  if (!address) return null;

  if (compact) {
    return (
      <div className="py-2">
        {pendingCount > 0 && (
          <div className="px-3 py-2 flex items-center gap-2 text-yellow-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>{pendingCount} pending</span>
          </div>
        )}
        
        {displayTxs.length === 0 ? (
          <div className="px-3 py-4 text-center text-zinc-500 text-sm">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-1">
            {displayTxs.map((tx, _index) => (
              <TransactionItem 
                key={tx.hash} 
                tx={tx} 
                explorerUrl={explorerUrl}
                compact 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Clock className="text-yellow-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Transactions</h3>
            {pendingCount > 0 && (
              <p className="text-xs text-yellow-400">{pendingCount} pending</p>
            )}
          </div>
        </div>
        
        {isPolling && (
          <RefreshCw size={16} className="text-cyan-400 animate-spin" />
        )}
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-zinc-800">
        <AnimatePresence>
          {displayTxs.map((tx, index) => (
            <motion.div
              key={tx.hash}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <TransactionItem tx={tx} explorerUrl={explorerUrl} />
            </motion.div>
          ))}
        </AnimatePresence>

        {displayTxs.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>No recent transactions</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Single transaction item
 */
function TransactionItem({ 
  tx, 
  explorerUrl,
  compact = false 
}: { 
  tx: Transaction; 
  explorerUrl: string;
  compact?: boolean;
}) {
  const statusConfig = {
    pending: {
      icon: <Loader2 size={compact ? 14 : 16} className="animate-spin text-yellow-400" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    confirmed: {
      icon: <CheckCircle2 size={compact ? 14 : 16} className="text-green-400" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    failed: {
      icon: <XCircle size={compact ? 14 : 16} className="text-red-400" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  };

  const typeConfig = {
    send: { icon: ArrowUpRight, label: 'Sent', color: 'text-orange-400' },
    receive: { icon: ArrowDownLeft, label: 'Received', color: 'text-green-400' },
    contract: { icon: RefreshCw, label: 'Contract', color: 'text-purple-400' },
    swap: { icon: RefreshCw, label: 'Swap', color: 'text-cyan-400' },
  };

  const status = statusConfig[tx.status];
  const type = typeConfig[tx.type];
  const TypeIcon = type.icon;

  if (compact) {
    return (
      <a
        href={`${explorerUrl}/tx/${tx.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 transition-colors"
      >
        {status.icon}
        <span className={`text-xs ${type.color}`}>{type.label}</span>
        {tx.amount && (
          <span className="text-xs text-white ml-auto">
            {tx.amount} {tx.symbol}
          </span>
        )}
        <ExternalLink size={12} className="text-zinc-500" />
      </a>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${status.bg}`}>
          <TypeIcon size={18} className={type.color} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{type.label}</p>
            {status.icon}
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
          </p>
        </div>
      </div>
      
      <div className="text-right flex items-center gap-3">
        {tx.amount && (
          <div>
            <p className="text-sm font-medium text-white">
              {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol}
            </p>
            <p className="text-xs text-zinc-500">{formatTimeAgo(tx.timestamp)}</p>
          </div>
        )}
        <a
          href={`${explorerUrl}/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

/**
 * Pending transaction badge for navbar
 */
export function PendingTransactionBadge() {
  const { pendingCount } = usePendingTransactions();

  if (pendingCount === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"
    >
      <span className="text-[10px] font-bold text-black">{pendingCount}</span>
    </motion.div>
  );
}

// Utility
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
