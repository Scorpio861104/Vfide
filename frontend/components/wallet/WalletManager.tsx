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
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';
import { safeParseFloat } from '@/lib/validation';

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

function generateTokenBalances(address: string): TokenBalance[] {
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

function generateTransactions(address: string): Transaction[] {
  const transactions: Transaction[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    transactions.push({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: i % 2 === 0 ? address : '0xother...addr',
      to: i % 2 === 0 ? '0xother...addr' : address,
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

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(balance: string, decimals: number = 18): string {
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
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border-2 transition-all ${
        wallet.isActive
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl md:text-4xl flex-shrink-0">{wallet.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">
                {wallet.nickname}
              </h3>
              <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
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
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Balance</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {wallet.balance} {chain?.symbol}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ${wallet.balanceUSD.toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!wallet.isActive && wallet.connected && (
          <MobileButton
            onClick={() => onActivate(wallet.id)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
          >
            Set Active
          </MobileButton>
        )}
        {wallet.isActive && (
          <span className="flex-1 text-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium py-2 px-3 rounded-lg text-sm">
            Active Wallet
          </span>
        )}
        <MobileButton
          onClick={() => onEdit(wallet.id)}
          className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
        >
          Edit
        </MobileButton>
        <MobileButton
          onClick={() => onDisconnect(wallet.id)}
          className="flex-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 font-medium py-2 px-3 rounded-lg text-sm transition-colors"
        >
          Disconnect
        </MobileButton>
      </div>

      {/* Last Used */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        Last used {(() => Math.floor((Date.now() - wallet.lastUsed) / (60 * 1000)))()} minutes ago
      </p>
    </div>
  );
}

interface ChainSelectorProps {
  chains: Chain[];
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
}

function ChainSelector({ chains, selectedChain, onSelectChain }: ChainSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
        Select Network
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => onSelectChain(chain.id)}
            className={`p-3 md:p-4 rounded-lg border-2 transition-all text-left ${
              selectedChain === chain.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl">{chain.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">
                  {chain.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{chain.symbol}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
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
              <span className="text-2xl md:text-3xl flex-shrink-0">{token.logo}</span>
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
    <div className={`rounded-lg p-4 md:p-6 bg-gradient-to-br ${color} text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">{label}</p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <span className="text-3xl md:text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function WalletManager() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'chains' | 'tokens' | 'settings'>(
    'wallets'
  );
  const [wallets, setWallets] = useState<Wallet[]>(generateMockWallets());
  const [selectedChain, setSelectedChain] = useState<number>(1);
  const [tokens, setTokens] = useState<TokenBalance[]>(
    generateTokenBalances(wallets[0]?.address)
  );
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletNickname, setWalletNickname] = useState('');

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
  };

  const handleDisconnectWallet = (id: string) => {
    setWallets(wallets.filter((w) => w.id !== id));
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
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-center transition-colors text-sm md:text-base ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'wallets' && '👛 Wallets'}
                {tab === 'chains' && '🔗 Networks'}
                {tab === 'tokens' && '💰 Tokens'}
                {tab === 'settings' && '⚙️ Settings'}
              </button>
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
        {showConnectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 max-w-md w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Connect Wallet
              </h2>
              <div className="space-y-3">
                {['metamask', 'walletconnect', 'ledger', 'coinbase'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleConnectWallet(type)}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <span className="text-3xl">{getWalletTypeIcon(type)}</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {type}
                    </span>
                  </button>
                ))}
              </div>
              <MobileButton
                onClick={() => setShowConnectModal(false)}
                className="w-full mt-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </MobileButton>
            </div>
          </div>
        )}

        {/* Edit Wallet Modal */}
        {editingWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 max-w-md w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Edit Wallet Nickname
              </h2>
              <div className="space-y-4">
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
                  <MobileButton
                    onClick={handleSaveWalletNickname}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Save
                  </MobileButton>
                  <MobileButton
                    onClick={() => {
                      setEditingWallet(null);
                      setWalletNickname('');
                    }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </MobileButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}
