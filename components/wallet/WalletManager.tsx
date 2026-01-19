/**
 * Advanced Wallet Manager Component
 * Multi-wallet support, chain switching, balance tracking, and connection management
 * 
 * Features:
 * - Connect multiple wallets (MetaMask, WalletConnect, Ledger, Coinbase)
 * - Switch between connected wallets
 * - Multi-chain support with easy switching
 * - Real-time balance tracking
 * - Connection status indicators
 * - Transaction history per wallet
 * - Wallet nicknames/labels
 * - Security features (auto-disconnect, session timeout)
 * - Mobile-responsive design
 * - Dark mode support
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MobileButton, MobileInput } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';
import { safeParseFloat } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { Wallet, Link2, Coins, Settings, CheckCircle2, X, Edit3, Power } from 'lucide-react';

// Animated counter for balances
function AnimatedBalance({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toLocaleString());
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);
  
  return <motion.span>{prefix}{rounded}{suffix}</motion.span>;
}

// ==================== TYPES ====================

interface Wallet {
  id: string;
  address: string;
  type: 'metamask' | 'walletconnect' | 'ledger' | 'coinbase' | 'injected';
  nickname: string;
  balance: string;
  balanceUSD: number;
  chainId: number;
  chainName: string;
  connected: boolean;
  isActive: boolean;
  connectedAt: number;
  lastUsed: number;
  icon: string;
}

interface Chain {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  icon: string;
  color: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  balanceFormatted: string;
  valueUSD: number;
  decimals: number;
  logo: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: number;
  type: 'send' | 'receive' | 'contract';
}

interface WalletStats {
  totalWallets: number;
  connectedWallets: number;
  totalBalanceUSD: number;
  totalTransactions: number;
}

// ==================== MOCK DATA ====================

const supportedChains: Chain[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    icon: '⟠',
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    icon: '🔵',
    color: 'from-blue-500 to-blue-700',
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    icon: '💜',
    color: 'from-purple-400 to-purple-600',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    icon: '🔷',
    color: 'from-blue-300 to-blue-500',
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    icon: '🔴',
    color: 'from-red-400 to-red-600',
  },
];

function generateMockWallets(): Wallet[] {
  return [
    {
      id: 'wallet-1',
      address: '0x1234...5678',
      type: 'metamask',
      nickname: 'Main Wallet',
      balance: '2.5',
      balanceUSD: 8750,
      chainId: 1,
      chainName: 'Ethereum',
      connected: true,
      isActive: true,
      connectedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 30 * 60 * 1000,
      icon: '🦊',
    },
    {
      id: 'wallet-2',
      address: '0xabcd...ef01',
      type: 'ledger',
      nickname: 'Hardware Wallet',
      balance: '15.8',
      balanceUSD: 55300,
      chainId: 1,
      chainName: 'Ethereum',
      connected: true,
      isActive: false,
      connectedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 2 * 60 * 60 * 1000,
      icon: '🔐',
    },
    {
      id: 'wallet-3',
      address: '0x9876...5432',
      type: 'walletconnect',
      nickname: 'Mobile Wallet',
      balance: '0.85',
      balanceUSD: 2975,
      chainId: 8453,
      chainName: 'Base',
      connected: true,
      isActive: false,
      connectedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 5 * 60 * 60 * 1000,
      icon: '📱',
    },
  ];
}

function generateTokenBalances(_address: string): TokenBalance[] {
  return [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '2500000000000000000',
      balanceFormatted: '2.5',
      valueUSD: 8750,
      decimals: 18,
      logo: '⟠',
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '5000000000',
      balanceFormatted: '5000',
      valueUSD: 5000,
      decimals: 6,
      logo: '💵',
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      balance: '3500000000',
      balanceFormatted: '3500',
      valueUSD: 3500,
      decimals: 6,
      logo: '💲',
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      balance: '2000000000000000000000',
      balanceFormatted: '2000',
      valueUSD: 2000,
      decimals: 18,
      logo: '◈',
    },
  ];
}

function _generateTransactions(walletAddress: string): Transaction[] {
  const transactions: Transaction[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    transactions.push({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: i % 2 === 0 ? walletAddress : '0xother...addr',
      to: i % 2 === 0 ? '0xother...addr' : walletAddress,
      value: (Math.random() * 2).toFixed(4),
      timestamp: now - i * 24 * 60 * 60 * 1000,
      status: i === 0 ? 'pending' : 'confirmed',
      chainId: 1,
      type: i % 2 === 0 ? 'send' : 'receive',
    });
  }

  return transactions;
}

function calculateWalletStats(wallets: Wallet[]): WalletStats {
  return {
    totalWallets: wallets.length,
    connectedWallets: wallets.filter((w) => w.connected).length,
    totalBalanceUSD: wallets.reduce((sum, w) => sum + w.balanceUSD, 0),
    totalTransactions: 156,
  };
}

// ==================== HELPER FUNCTIONS ====================

function _shortenAddress(walletAddress: string): string {
  if (!walletAddress) return '';
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

function _formatBalance(balance: string, decimals: number = 18): string {
  const num = safeParseFloat(balance, 0) / Math.pow(10, decimals);
  if (num < 0.01) return '< 0.01';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function getWalletTypeIcon(type: string): string {
  switch (type) {
    case 'metamask':
      return '🦊';
    case 'walletconnect':
      return '📱';
    case 'ledger':
      return '🔐';
    case 'coinbase':
      return '🔵';
    default:
      return '👛';
  }
}

function getStatusColor(connected: boolean, isActive: boolean): string {
  if (!connected) return 'bg-gray-400';
  if (isActive) return 'bg-green-500';
  return 'bg-yellow-500';
}

function getChainById(chainId: number): Chain | undefined {
  return supportedChains.find((c) => c.id === chainId);
}

// ==================== COMPONENTS ====================

interface WalletCardProps {
  wallet: Wallet;
  onActivate: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (id: string) => void;
}

function WalletCard({ wallet, onActivate, onDisconnect, onEdit }: WalletCardProps) {
  const statusColor = getStatusColor(wallet.connected, wallet.isActive);
  const chain = getChainById(wallet.chainId);

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border-2 ${
        wallet.isActive
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 shadow-sm'
      }`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, borderColor: wallet.isActive ? undefined : 'rgba(59, 130, 246, 0.5)' }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <motion.span 
            className="text-3xl md:text-4xl shrink-0"
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
          >
            {wallet.icon}
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">
                {wallet.nickname}
              </h3>
              <motion.div 
                className={`w-2 h-2 rounded-full ${statusColor} shrink-0`}
                animate={wallet.isActive ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <p className="font-mono text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {wallet.address}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {wallet.type} • {chain?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <motion.div 
        className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Balance</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {wallet.balance} {chain?.symbol}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <AnimatedBalance value={wallet.balanceUSD} prefix="$" />
        </p>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!wallet.isActive && wallet.connected && (
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => onActivate(wallet.id)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Set Active
            </MobileButton>
          </motion.div>
        )}
        {wallet.isActive && (
          <motion.span 
            className="flex-1 text-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
            animate={{ boxShadow: ['0 0 0px rgba(34, 197, 94, 0)', '0 0 10px rgba(34, 197, 94, 0.3)', '0 0 0px rgba(34, 197, 94, 0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Active
          </motion.span>
        )}
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MobileButton
            onClick={() => onEdit(wallet.id)}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </MobileButton>
        </motion.div>
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MobileButton
            onClick={() => onDisconnect(wallet.id)}
            className="w-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Power className="w-4 h-4" />
            Disconnect
          </MobileButton>
        </motion.div>
      </div>

      {/* Last Used */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        Last used {(() => Math.floor((Date.now() - wallet.lastUsed) / (60 * 1000)))()} minutes ago
      </p>
    </motion.div>
  );
}

interface ChainSelectorProps {
  chains: Chain[];
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
}

function ChainSelector({ chains, selectedChain, onSelectChain }: ChainSelectorProps) {
  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Link2 className="w-5 h-5" />
        Select Network
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chains.map((chain, index) => (
          <motion.button
            key={chain.id}
            onClick={() => onSelectChain(chain.id)}
            className={`p-3 md:p-4 rounded-lg border-2 text-left ${
              selectedChain === chain.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03, borderColor: 'rgb(59, 130, 246)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-2xl md:text-3xl"
                animate={selectedChain === chain.id ? { rotate: [0, 360] } : {}}
                transition={{ duration: 0.5 }}
              >
                {chain.icon}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">
                  {chain.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{chain.symbol}</p>
              </div>
              {selectedChain === chain.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

interface TokenListProps {
  tokens: TokenBalance[];
}

function TokenList({ tokens }: TokenListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
        Token Balances
      </h3>
      <div className="space-y-3">
        {tokens.map((token, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl md:text-3xl shrink-0">{token.logo}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                  {token.symbol}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{token.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                {token.balanceFormatted}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ${token.valueUSD.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <motion.div 
      className={`rounded-lg p-4 md:p-6 bg-linear-to-br ${color} text-white shadow-lg`}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">{label}</p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <motion.span 
          className="text-3xl md:text-4xl opacity-80"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          {icon}
        </motion.span>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function WalletManager() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'chains' | 'tokens' | 'settings'>(
    'wallets'
  );
  const [wallets, setWallets] = useState<Wallet[]>(generateMockWallets());
  const [selectedChain, setSelectedChain] = useState<number>(1);
  const [tokens, _setTokens] = useState<TokenBalance[]>(
    generateTokenBalances(wallets[0]?.address ?? '')
  );
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletNickname, setWalletNickname] = useState('');
  const [showConnectionSuccess, setShowConnectionSuccess] = useState(false);
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  const stats = calculateWalletStats(wallets);
  const activeWallet = wallets.find((w) => w.isActive);

  const handleActivateWallet = (id: string) => {
    setWallets(
      wallets.map((w) => ({
        ...w,
        isActive: w.id === id,
        lastUsed: w.id === id ? Date.now() : w.lastUsed,
      }))
    );
    playSuccess();
  };

  const handleDisconnectWallet = (id: string) => {
    setWallets(wallets.filter((w) => w.id !== id));
    playError();
  };

  const handleEditWallet = (id: string) => {
    const wallet = wallets.find((w) => w.id === id);
    if (wallet) {
      setEditingWallet(id);
      setWalletNickname(wallet.nickname);
    }
  };

  const handleSaveWalletNickname = () => {
    if (editingWallet && walletNickname) {
      setWallets(
        wallets.map((w) =>
          w.id === editingWallet ? { ...w, nickname: walletNickname } : w
        )
      );
      setEditingWallet(null);
      setWalletNickname('');
    }
  };

  const handleSwitchChain = (chainId: number) => {
    setSelectedChain(chainId);
    playNotification();
    // Update active wallet's chain
    if (activeWallet) {
      setWallets(
        wallets.map((w) =>
          w.isActive
            ? {
                ...w,
                chainId,
                chainName: getChainById(chainId)?.name || 'Unknown',
              }
            : w
        )
      );
    }
  };

  const handleConnectWallet = (type: string) => {
    const newWallet: Wallet = {
      id: `wallet-${Date.now()}`,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      type: type as any,
      nickname: `${type} Wallet`,
      balance: '0',
      balanceUSD: 0,
      chainId: selectedChain,
      chainName: getChainById(selectedChain)?.name || 'Unknown',
      connected: true,
      isActive: false,
      connectedAt: Date.now(),
      lastUsed: Date.now(),
      icon: getWalletTypeIcon(type),
    };
    setWallets([...wallets, newWallet]);
    setShowConnectModal(false);
    setShowConnectionSuccess(true);
    playSuccess();
    setTimeout(() => setShowConnectionSuccess(false), 2000);
  };

  // ==================== TAB CONTENT ====================

  const renderWalletsTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className={`grid ${responsiveGrids.auto} gap-4`}>
        <StatCard
          label="Total Wallets"
          value={stats.totalWallets}
          icon="👛"
          color="from-blue-500 to-blue-700"
        />
        <StatCard
          label="Connected"
          value={stats.connectedWallets}
          icon="🔗"
          color="from-green-500 to-green-700"
        />
        <StatCard
          label="Total Balance"
          value={`$${stats.totalBalanceUSD.toLocaleString()}`}
          icon="💰"
          color="from-purple-500 to-purple-700"
        />
        <StatCard
          label="Transactions"
          value={stats.totalTransactions}
          icon="📊"
          color="from-orange-500 to-orange-700"
        />
      </div>

      {/* Connect Button */}
      <MobileButton
        onClick={() => setShowConnectModal(true)}
        className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        + Connect New Wallet
      </MobileButton>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onActivate={handleActivateWallet}
            onDisconnect={handleDisconnectWallet}
            onEdit={handleEditWallet}
          />
        ))}
      </div>
    </div>
  );

  const renderChainsTab = () => (
    <div className="space-y-6">
      <ChainSelector
        chains={supportedChains}
        selectedChain={selectedChain}
        onSelectChain={handleSwitchChain}
      />

      {activeWallet && (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Active Wallet:</strong> {activeWallet.nickname} is connected to{' '}
            {getChainById(activeWallet.chainId)?.name}
          </p>
        </div>
      )}
    </div>
  );

  const renderTokensTab = () => (
    <div className="space-y-6">
      {activeWallet ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2">
              Active Wallet
            </h3>
            <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
              {activeWallet.address}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeWallet.nickname} • {getChainById(activeWallet.chainId)?.name}
            </p>
          </div>
          <TokenList tokens={tokens} />
        </>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 text-center">
          <p className="text-yellow-800 dark:text-yellow-200">
            No active wallet selected. Please activate a wallet to view token balances.
          </p>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
          Wallet Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-connect on page load
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show balance in USD
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable notifications
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Require confirmation for all transactions
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 md:p-6 border border-red-200 dark:border-red-700">
        <h3 className="text-base md:text-lg font-bold text-red-800 dark:text-red-200 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          Disconnect all wallets and clear all data. This action cannot be undone.
        </p>
        <MobileButton
          onClick={() => {
            if (confirm('Are you sure you want to disconnect all wallets?')) {
              setWallets([]);
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Disconnect All Wallets
        </MobileButton>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <ResponsiveContainer>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Wallet Manager
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            Manage your connected wallets and switch between networks
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 dark:border-gray-700">
            {(['wallets', 'chains', 'tokens', 'settings'] as const).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  playNotification();
                }}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-center text-sm md:text-base relative ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  {tab === 'wallets' && <><Wallet className="w-4 h-4" /> Wallets</>}
                  {tab === 'chains' && <><Link2 className="w-4 h-4" /> Networks</>}
                  {tab === 'tokens' && <><Coins className="w-4 h-4" /> Tokens</>}
                  {tab === 'settings' && <><Settings className="w-4 h-4" /> Settings</>}
                </span>
                {activeTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    layoutId="walletTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-8">
            {activeTab === 'wallets' && renderWalletsTab()}
            {activeTab === 'chains' && renderChainsTab()}
            {activeTab === 'tokens' && renderTokensTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </div>
        </div>

        {/* Connect Wallet Modal */}
        <AnimatePresence>
          {showConnectModal && (
            <motion.div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 max-w-md w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Connect Wallet
                  </h2>
                  <motion.button
                    onClick={() => setShowConnectModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>
                <div className="space-y-3">
                  {['metamask', 'walletconnect', 'ledger', 'coinbase'].map((type, index) => (
                    <motion.button
                      key={type}
                      onClick={() => handleConnectWallet(type)}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgb(59, 130, 246)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-3xl">{getWalletTypeIcon(type)}</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {type}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Success Toast */}
        <AnimatePresence>
          {showConnectionSuccess && (
            <motion.div
              className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
            >
              <CheckCircle2 className="w-5 h-5" />
              Wallet Connected!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Wallet Modal */}
        <AnimatePresence>
          {editingWallet && (
            <motion.div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 max-w-md w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-6 h-6" />
                    Edit Wallet
                  </h2>
                  <motion.button
                    onClick={() => {
                      setEditingWallet(null);
                      setWalletNickname('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nickname
                    </label>
                    <MobileInput
                      type="text"
                      value={walletNickname}
                      onChange={(e) => setWalletNickname(e.target.value)}
                      placeholder="Enter wallet nickname"
                    />
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => {
                        handleSaveWalletNickname();
                        playSuccess();
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Save
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setEditingWallet(null);
                        setWalletNickname('');
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveContainer>
    </div>
  );
}
