'use client';
import { log } from '@/lib/logging';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Coins, ChevronDown, RefreshCw, ExternalLink } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

/**
 * Multi-Chain Balance View Component
 * 
 * Shows balances across multiple chains for the connected wallet
 * Uses public RPC endpoints to fetch balances
 */

interface ChainBalance {
  chainId: number;
  name: string;
  symbol: string;
  balance: string;
  balanceUSD: string;
  icon: string;
  explorer: string;
  rpc: string;
  color: string;
}

// Chain configurations
const CHAINS: Omit<ChainBalance, 'balance' | 'balanceUSD'>[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '⟠',
    explorer: 'https://etherscan.io',
    rpc: 'https://eth.llamarpc.com',
    color: '#627EEA',
  },
  {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    icon: '🔵',
    explorer: 'https://basescan.org',
    rpc: 'https://mainnet.base.org',
    color: '#0052FF',
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    icon: '🔵',
    explorer: 'https://sepolia.basescan.org',
    rpc: 'https://sepolia.base.org',
    color: '#0052FF',
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔷',
    explorer: 'https://arbiscan.io',
    rpc: 'https://arb1.arbitrum.io/rpc',
    color: '#28A0F0',
  },
  {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    icon: '🔴',
    explorer: 'https://optimistic.etherscan.io',
    rpc: 'https://mainnet.optimism.io',
    color: '#FF0420',
  },
  {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '💜',
    explorer: 'https://polygonscan.com',
    rpc: 'https://polygon-rpc.com',
    color: '#8247E5',
  },
];

// Approximate prices (in production, fetch from price API)
const APPROX_PRICES: Record<string, number> = {
  ETH: 2500,
  MATIC: 0.80,
};

interface MultiChainBalanceProps {
  compact?: boolean;
}

export function MultiChainBalance({ compact = false }: MultiChainBalanceProps) {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { playSuccess, playNotification } = useTransactionSounds();

  // Fetch balances from all chains
  const fetchBalances = async () => {
    if (!address) return;
    
    setIsLoading(true);
    let hasErrors = false;
    
    const results = await Promise.all(
      CHAINS.map(async (chain) => {
        try {
          const response = await fetch(chain.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [address, 'latest'],
              id: chain.chainId,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          const balanceWei = parseInt(data.result || '0', 16);
          const balanceEth = balanceWei / 1e18;
          const price = APPROX_PRICES[chain.symbol] || 0;
          const balanceUSD = balanceEth * price;
          
          return {
            ...chain,
            balance: formatBalance(balanceEth),
            balanceUSD: formatUSD(balanceUSD),
          };
        } catch (error) {
          hasErrors = true;
          log.warn(`Failed to fetch balance for ${chain.name}`, error);
          return {
            ...chain,
            balance: '—',
            balanceUSD: '—',
          };
        }
      })
    );
    
    setBalances(results);
    setLastUpdated(new Date());
    setIsLoading(false);
    
    if (hasErrors) {
      import('@/components/ui/toast').then(({ toast }) => {
        toast.warning?.('Some balances unavailable', {
          description: 'Could not fetch balances from all networks. Click refresh to try again.',
          action: {
            label: 'Retry',
            onClick: () => fetchBalances()
          }
        });
      });
    } else {
      playSuccess();
    }
  };

  // Fetch on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [address, isConnected]);

  // Calculate total USD value with memoization to avoid regex parsing on every render
  const totalUSD = useMemo(() => {
    return balances.reduce((sum, b) => {
      const value = parseFloat(b.balanceUSD.replace(/[^0-9.]/g, '')) || 0;
      return sum + value;
    }, 0);
  }, [balances]);

  if (!isConnected) return null;

  if (compact) {
    return (
      <motion.button
        onClick={() => {
          setIsExpanded(!isExpanded);
          playNotification();
        }}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Coins size={16} className="text-cyan-400" />
        <motion.span 
          className="text-sm text-white font-medium"
          key={totalUSD}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {formatUSD(totalUSD)}
        </motion.span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-zinc-400" />
        </motion.div>
      </motion.button>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Coins className="text-cyan-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Multi-Chain Balance</h3>
              <p className="text-xs text-zinc-500">
                {lastUpdated ? `Updated ${formatTimeAgo(lastUpdated)}` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-xl font-bold text-white"
              key={totalUSD}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {formatUSD(totalUSD)}
            </motion.span>
            <motion.button
              onClick={() => {
                fetchBalances();
                playNotification();
              }}
              disabled={isLoading}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
              >
                <RefreshCw size={16} />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Chain List */}
      <div className="divide-y divide-zinc-800">
        <AnimatePresence>
          {balances.map((chain, index) => (
            <motion.div
              key={chain.chainId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.5)' }}
            >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${chain.color}20` }}
              >
                {chain.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{chain.name}</p>
                <p className="text-xs text-zinc-500">{chain.symbol}</p>
              </div>
            </div>
            
            <div className="text-right flex items-center gap-3">
              <div>
                <motion.p 
                  className="text-sm font-medium text-white"
                  key={chain.balance}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {chain.balance}
                </motion.p>
                <p className="text-xs text-zinc-500">{chain.balanceUSD}</p>
              </div>
              <motion.a
                href={`${chain.explorer}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <ExternalLink size={14} />
              </motion.a>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {isLoading && balances.length === 0 && (
        <div className="p-8 flex items-center justify-center">
          <RefreshCw size={24} className="text-cyan-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline multi-chain indicator
 */
export function MultiChainIndicator() {
  const { address, isConnected } = useAccount();
  const [activeChains, setActiveChains] = useState<number>(0);

  useEffect(() => {
    if (!isConnected || !address) return;
    
    // Quick check for chains with balance
    const checkChains = async () => {
      let count = 0;
      for (const chain of CHAINS.slice(0, 4)) { // Check first 4 chains
        try {
          const response = await fetch(chain.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [address, 'latest'],
              id: 1,
            }),
          });
          const data = await response.json();
          const balance = parseInt(data.result || '0', 16);
          if (balance > 0) count++;
        } catch {
          // Ignore errors
        }
      }
      setActiveChains(count);
    };
    
    checkChains();
  }, [address, isConnected]);

  if (!isConnected || activeChains === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500">
      <div className="flex -space-x-1">
        {CHAINS.slice(0, activeChains).map(chain => (
          <div
            key={chain.chainId}
            className="w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center text-[8px]"
            style={{ backgroundColor: chain.color }}
            title={chain.name}
          >
            {chain.icon}
          </div>
        ))}
      </div>
      <span>{activeChains} chains</span>
    </div>
  );
}

// Utility functions
function formatBalance(value: number): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '< 0.0001';
  if (value < 1) return value.toFixed(4);
  return value.toFixed(3);
}

function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '< $0.01';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
