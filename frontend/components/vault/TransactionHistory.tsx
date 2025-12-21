"use client";

import { useState } from 'react';
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
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  const mockTransactions: Transaction[] = transactions.length > 0 ? transactions : [
    {
      id: '1',
      type: 'receive',
      amount: '+500 VFIDE',
      from: '0x1a2b...3c4d',
      timestamp: '2 hours ago',
      status: 'completed',
      txHash: '0xabc123...',
      blockNumber: 12345678
    },
    {
      id: '2',
      type: 'send',
      amount: '-150 VFIDE',
      to: '0x5e6f...7g8h',
      timestamp: '1 day ago',
      status: 'completed',
      txHash: '0xdef456...',
      blockNumber: 12345670
    },
    {
      id: '3',
      type: 'vault_deposit',
      amount: '-2000 VFIDE',
      to: 'Your Vault',
      timestamp: '3 days ago',
      status: 'completed',
      txHash: '0xghi789...',
      blockNumber: 12345650
    },
    {
      id: '4',
      type: 'guardian_added',
      to: '0x9i0j...1k2l',
      timestamp: '5 days ago',
      status: 'completed',
      txHash: '0xjkl012...',
      blockNumber: 12345600
    },
    {
      id: '5',
      type: 'next_of_kin_set',
      to: '0x3m4n...5o6p',
      timestamp: '1 week ago',
      status: 'completed',
      txHash: '0xmno345...',
      blockNumber: 12345500
    },
  ];

  const filteredTransactions = mockTransactions.filter(tx => {
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
        return 'text-[#50C878]';
      case 'send':
        return 'text-[#FF6B6B]';
      case 'vault_deposit':
      case 'vault_withdraw':
        return 'text-[#0080FF]';
      default:
        return 'text-[#00F0FF]';
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

  return (
    <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8]">
          Transaction History
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A5]" size={16} />
            <input
              type="text"
              placeholder="Search tx hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] text-sm w-full sm:w-48"
            />
          </div>
          
          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A5]" size={16} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] text-sm appearance-none cursor-pointer w-full sm:w-auto"
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
            <div key={i} className="h-20 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-[#A0A0A5] text-sm">No transactions found</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg hover:border-[#00F0FF]/50 transition-colors gap-3 sm:gap-0"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`p-3 rounded-full ${
                  tx.type === 'receive' 
                    ? 'bg-[#50C878]/20' 
                    : tx.type === 'send'
                    ? 'bg-[#FF6B6B]/20'
                    : tx.type.includes('vault')
                    ? 'bg-[#0080FF]/20'
                    : 'bg-[#00F0FF]/20'
                } ${getColor(tx.type)}`}>
                  {getIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#F5F3E8] font-bold truncate">
                    {getLabel(tx.type)}
                  </div>
                  {tx.amount && (
                    <div className={`font-bold text-sm ${getColor(tx.type)}`}>
                      {tx.amount}
                    </div>
                  )}
                  {(tx.from || tx.to) && (
                    <div className="text-[#A0A0A5] text-sm truncate">
                      {tx.from ? `From ${tx.from}` : `To ${tx.to}`}
                    </div>
                  )}
                  <div className="text-[#A0A0A5] text-xs mt-1 flex items-center gap-2">
                    <Clock size={12} />
                    {tx.timestamp}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className={`px-3 py-1 rounded text-xs font-bold ${
                  tx.status === 'completed' 
                    ? 'bg-[#50C878]/20 border border-[#50C878] text-[#50C878]' 
                    : tx.status === 'pending'
                    ? 'bg-[#FFA500]/20 border border-[#FFA500] text-[#FFA500]'
                    : 'bg-[#C41E3A]/20 border border-[#C41E3A] text-[#C41E3A]'
                }`}>
                  {tx.status}
                </div>
                <a 
                  href={`https://explorer.zksync.io/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00F0FF] hover:text-[#00D0DF] transition-colors flex items-center gap-1 text-xs"
                >
                  View
                  <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {filteredTransactions.length > 0 && (
        <div className="mt-4 text-center">
          <button className="text-[#00F0FF] text-sm hover:underline">
            Load More →
          </button>
        </div>
      )}
    </div>
  );
}
