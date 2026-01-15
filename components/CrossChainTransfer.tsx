'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCrossChain, Route, TransferRequest } from '@/lib/crossChain';
import { useAccount } from 'wagmi';
import { toast } from '@/lib/toast';

// ============================================================================
// Cross-Chain Transfer Component
// ============================================================================

export default function CrossChainTransfer() {
  const { address } = useAccount();
  const {
    balances,
    routes,
    currentTransfer,
    loading,
    error,
    supportedChains,
    findOptimalRoutes,
    initiateTransfer,
    getChain,
    refreshBalances,
  } = useCrossChain(address);

  // Cache filtered mainnet chains to avoid filtering on every render
  const mainnetChains = useMemo(() => {
    return supportedChains.filter((c) => !c.isTestnet);
  }, [supportedChains]);

  // Form state
  const [fromChain, setFromChain] = useState(8453); // Base
  const [toChain, setToChain] = useState(42161); // Arbitrum
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Debounce route finding
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const request: TransferRequest = {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        recipient: recipient || address || '',
        slippage: 0.5,
      };

      findOptimalRoutes(request);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fromChain, toChain, fromToken, toToken, amount, recipient, address, findOptimalRoutes]);

  // Auto-select recommended route
  useEffect(() => {
    const recommended = routes.find((r) => r.tags.includes('recommended'));
    if (recommended) {
      setSelectedRoute(recommended);
    } else if (routes.length > 0 && routes[0]) {
      setSelectedRoute(routes[0]);
    }
  }, [routes]);

  const handleSwapChains = useCallback(() => {
    setFromChain(toChain);
    setToChain(fromChain);
  }, [fromChain, toChain]);

  const handleTransfer = useCallback(async () => {
    if (!selectedRoute) {
      toast.error('Please select a route');
      return;
    }

    if (!address) {
      toast.error('Please connect wallet');
      return;
    }

    const request: TransferRequest = {
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      recipient: recipient || address,
    };

    // In production, this would use the actual wallet signer
    const mockSigner = {
      sendTransaction: async (_tx: unknown) => ({
        hash: '0x' + Math.random().toString(16).slice(2),
        wait: async () => ({}),
      }),
    };

    const transferId = await initiateTransfer(selectedRoute, request, mockSigner);
    if (transferId) {
      toast.success('Transfer initiated');
    }
  }, [selectedRoute, address, fromChain, toChain, fromToken, toToken, amount, recipient, initiateTransfer]);

  const _fromChainData = getChain(fromChain);
  const _toChainData = getChain(toChain);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Cross-Chain Transfer</h2>
          <p className="text-sm text-muted-foreground">
            Send assets across any supported chain
          </p>
        </div>
        <button
          onClick={refreshBalances}
          className="p-2 bg-muted rounded-lg hover:bg-muted/80 self-start sm:self-auto"
          aria-label="Refresh balances"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Unified Balance View */}
      <div className="bg-linear-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Total Balances</h3>
        <div className="flex flex-wrap gap-3">
          {balances.slice(0, 5).map((balance) => (
            <div key={balance.token} className="bg-background/50 rounded-lg px-3 py-2">
              <div className="text-lg font-semibold">{parseFloat(balance.totalBalance).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">{balance.token}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Form */}
      <div className="bg-card rounded-2xl border p-4 space-y-4">
        {/* From Chain */}
        <div className="bg-muted rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">From</span>
            <span className="text-muted-foreground">
              Balance: {balances.find((b) => b.token === fromToken)?.totalBalance || '0'}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              value={fromChain}
              onChange={(e) => setFromChain(Number(e.target.value))}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {mainnetChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full mt-3 bg-transparent text-2xl font-semibold outline-none"
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2">
          <button
            onClick={handleSwapChains}
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 z-10"
            aria-label="Swap chains"
          >
            <SwapIcon />
          </button>
        </div>

        {/* To Chain */}
        <div className="bg-muted rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">To</span>
          </div>
          <div className="flex gap-3">
            <select
              value={toChain}
              onChange={(e) => setToChain(Number(e.target.value))}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {mainnetChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <div className="mt-3 text-2xl font-semibold text-muted-foreground">
            ~{selectedRoute?.toAmount || '0.0'}
          </div>
        </div>

        {/* Recipient (optional) */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Recipient (leave empty for self)
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Routes */}
      {routes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Available Routes</h3>
          <div className="space-y-2">
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onSelect={() => setSelectedRoute(route)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transfer Status */}
      {currentTransfer && (
        <TransferStatusCard transfer={currentTransfer} />
      )}

      {/* Action Button */}
      <button
        onClick={handleTransfer}
        disabled={!selectedRoute || loading || !amount || parseFloat(amount) <= 0}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Transfer'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Route Card Component
// ============================================================================

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
}

function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border text-left transition-colors ${
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{route.protocol}</span>
          {route.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${
                tag === 'recommended'
                  ? 'bg-green-500/20 text-green-500'
                  : tag === 'cheapest'
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'bg-yellow-500/20 text-yellow-500'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="text-sm font-semibold">
          {parseFloat(route.toAmount).toFixed(4)} {route.toToken.symbol}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          ~{formatTime(route.estimatedTime)}
        </span>
        <span className="flex items-center gap-1">
          <GasIcon className="w-3 h-3" />
          ${route.gasCost.usd.toFixed(2)} gas
        </span>
        <span className="flex items-center gap-1">
          <FeeIcon className="w-3 h-3" />
          ${route.bridgeFee.usd.toFixed(2)} fee
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Transfer Status Card
// ============================================================================

interface TransferStatusCardProps {
  transfer: {
    id: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    fromTxHash?: string;
    toTxHash?: string;
    error?: string;
  };
}

function TransferStatusCard({ transfer }: TransferStatusCardProps) {
  const statusColors = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500',
    bridging: 'bg-purple-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const progress = (transfer.currentStep / transfer.totalSteps) * 100;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Transfer Status</span>
        <span className={`text-xs px-2 py-1 rounded-full text-white ${statusColors[transfer.status as keyof typeof statusColors]}`}>
          {transfer.status}
        </span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        Step {transfer.currentStep} of {transfer.totalSteps}
      </div>

      {transfer.fromTxHash && (
        <div className="mt-2 text-xs">
          <span className="text-muted-foreground">Source TX: </span>
          <code className="font-mono">{transfer.fromTxHash.slice(0, 10)}...</code>
        </div>
      )}

      {transfer.error && (
        <div className="mt-2 text-xs text-red-500">{transfer.error}</div>
      )}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GasIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}

function FeeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
