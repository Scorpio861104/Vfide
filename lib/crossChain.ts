/**
 * Cross-Chain Abstraction Layer
 * 
 * Provides chain-agnostic transfers with automatic bridging and routing.
 * Can integrate with external bridge aggregators or use direct bridges.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

import {
  createConfig,
  EVM,
  getRoutes as lifiGetRoutes,
  executeRoute as lifiExecuteRoute,
  getTokenBalancesByChain,
} from '@lifi/sdk';
import type { Route as LifiRoute } from '@lifi/types';
import type { WalletClient } from 'viem';

// Initialize Li.Fi SDK at module load
createConfig({ integrator: 'VFIDE', preloadChains: false });

// Cache raw Li.Fi routes by ID so executeTransfer can look them up
const lifiRouteCache = new Map<string, LifiRoute>();

// ============================================================================
// Types
// ============================================================================

import { ZERO_ADDRESS } from './constants';

export interface Chain {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrl?: string;
  isTestnet?: boolean;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUri?: string;
}

export interface Route {
  id: string;
  protocol: string;
  fromChain: Chain;
  toChain: Chain;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number; // seconds
  gasCost: {
    amount: string;
    usd: number;
  };
  bridgeFee: {
    amount: string;
    usd: number;
  };
  totalCost: number; // USD
  steps: RouteStep[];
  tags: ('cheapest' | 'fastest' | 'recommended')[];
}

export interface RouteStep {
  type: 'swap' | 'bridge' | 'approve';
  protocol: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
}

export interface TransferRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  recipient: string;
  slippage?: number;
}

export interface TransferStatus {
  id: string;
  status: 'pending' | 'processing' | 'bridging' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  fromTxHash?: string;
  toTxHash?: string;
  error?: string;
  estimatedArrival?: number;
}

export interface Balance {
  chainId: number;
  token: Token;
  balance: string;
  usdValue: number;
}

export interface AggregatedBalance {
  token: string;
  totalBalance: string;
  totalUsdValue: number;
  byChain: Balance[];
}

// ============================================================================
// Supported Chains
// ============================================================================

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrl: '/chains/ethereum.svg',
  },
  {
    id: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrl: '/chains/optimism.svg',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrl: '/chains/arbitrum.svg',
  },
  {
    id: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrl: '/chains/polygon.svg',
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrl: '/chains/base.svg',
  },
  {
    id: 324,
    name: 'zkSync Era',
    shortName: 'ZK',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.era.zksync.io'],
    blockExplorerUrls: ['https://explorer.zksync.io'],
    iconUrl: '/chains/zksync.svg',
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'BASE-SEP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    iconUrl: '/chains/base.svg',
    isTestnet: true,
  },
  {
    id: 11155111,
    name: 'Sepolia',
    shortName: 'SEP',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrl: '/chains/ethereum.svg',
    isTestnet: true,
  },
];

// ============================================================================
// Common Tokens
// ============================================================================

export const COMMON_TOKENS: Record<number, Token[]> = {
  1: [
    { address: ZERO_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 1 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1 },
    { address: '0x6B175474E89094C44Da98b954EescdeCB5BE3830', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1 },
  ],
  8453: [
    { address: ZERO_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 8453 },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 8453 },
  ],
  42161: [
    { address: ZERO_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 42161 },
    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42161 },
  ],
  10: [
    { address: ZERO_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 10 },
    { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 10 },
  ],
  137: [
    { address: ZERO_ADDRESS, symbol: 'MATIC', name: 'MATIC', decimals: 18, chainId: 137 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137 },
  ],
};

// ============================================================================
// Route Finder
// ============================================================================

/**

// ============================================================================
// Route Finder
// ============================================================================

/**
 * Find optimal routes for cross-chain transfer via Li.Fi aggregator.
 */
export async function findRoutes(request: TransferRequest): Promise<Route[]> {
  const fromChain = SUPPORTED_CHAINS.find((c) => c.id === request.fromChain);
  const toChain = SUPPORTED_CHAINS.find((c) => c.id === request.toChain);

  if (!fromChain || !toChain) {
    throw new Error('Unsupported chain');
  }

  const fromToken = COMMON_TOKENS[request.fromChain]?.find(
    (t) =>
      t.address.toLowerCase() === request.fromToken.toLowerCase() ||
      t.symbol.toLowerCase() === request.fromToken.toLowerCase()
  );

  const toToken = COMMON_TOKENS[request.toChain]?.find(
    (t) =>
      t.address.toLowerCase() === request.toToken.toLowerCase() ||
      t.symbol.toLowerCase() === request.toToken.toLowerCase()
  );

  if (!fromToken || !toToken) {
    throw new Error('Unsupported token pair');
  }

  const lifiResponse = await lifiGetRoutes({
    fromChainId: request.fromChain,
    fromAmount: request.amount,
    fromTokenAddress: fromToken.address,
    toChainId: request.toChain,
    toTokenAddress: toToken.address,
    fromAddress: request.recipient,
    options: { slippage: request.slippage ?? 0.03 },
  });

  if (!lifiResponse.routes.length) {
    return [];
  }

  return lifiResponse.routes.map((lr) => {
    lifiRouteCache.set(lr.id, lr);

    const tags: Route['tags'] = [];
    if (lr.tags?.includes('CHEAPEST')) tags.push('cheapest');
    if (lr.tags?.includes('FASTEST')) tags.push('fastest');
    if (lr.tags?.includes('RECOMMENDED')) tags.push('recommended');

    const gasCostUsd = parseFloat(lr.gasCostUSD ?? '0');
    const bridgeFeeUsd = Math.max(
      0,
      parseFloat(lr.fromAmountUSD ?? '0') -
        parseFloat(lr.toAmountUSD ?? '0') -
        gasCostUsd
    );
    const totalTime = lr.steps.reduce(
      (acc, s) => acc + (s.estimate?.executionDuration ?? 0),
      0
    );

    return {
      id: lr.id,
      protocol: lr.steps[0]?.toolDetails?.name ?? lr.steps[0]?.tool ?? 'Li.Fi',
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount: lr.fromAmount,
      toAmount: lr.toAmount,
      estimatedTime: totalTime,
      gasCost: { amount: lr.gasCostUSD ?? '0', usd: gasCostUsd },
      bridgeFee: { amount: bridgeFeeUsd.toFixed(6), usd: bridgeFeeUsd },
      totalCost: gasCostUsd + bridgeFeeUsd,
      steps: lr.steps.map((s) => {
        // LiFiStep.type is always 'lifi'; derive swap vs bridge from chain IDs
        const stepType: RouteStep['type'] =
          s.action.fromChainId !== s.action.toChainId ? 'bridge' : 'swap';
        return {
          type: stepType,
          protocol: s.toolDetails?.name ?? s.tool,
          fromToken: {
            address: s.action.fromToken.address,
            symbol: s.action.fromToken.symbol,
            name: s.action.fromToken.name,
            decimals: s.action.fromToken.decimals,
            chainId: s.action.fromChainId,
            logoUri: s.action.fromToken.logoURI,
          },
          toToken: {
            address: s.action.toToken.address,
            symbol: s.action.toToken.symbol,
            name: s.action.toToken.name,
            decimals: s.action.toToken.decimals,
            chainId: s.action.toChainId,
            logoUri: s.action.toToken.logoURI,
          },
          fromAmount: s.action.fromAmount,
          toAmount: s.estimate?.toAmount ?? '0',
          estimatedTime: s.estimate?.executionDuration ?? 0,
        };
      }),
      tags,
    } satisfies Route;
  });
}

// ============================================================================
// Transfer Execution
// ============================================================================

const transferStatuses = new Map<string, TransferStatus>();

/**
 * Execute a cross-chain transfer using Li.Fi.
 * The route must be obtained from findRoutes() on this session.
 * walletClient is a viem WalletClient (e.g. from wagmi useWalletClient).
 */
export async function executeTransfer(
  route: Route,
  _request: TransferRequest,
  walletClient: WalletClient
): Promise<string> {
  const lifiRoute = lifiRouteCache.get(route.id);
  if (!lifiRoute) {
    throw new Error(
      'Route not found in cache. Call findRoutes() first and use a route returned from it.'
    );
  }

  // Configure Li.Fi EVM provider with the current wallet client before execution
  createConfig({
    integrator: 'VFIDE',
    preloadChains: false,
    providers: [EVM({ getWalletClient: () => Promise.resolve(walletClient as never) })],
  });

  const transferId = `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const status: TransferStatus = {
    id: transferId,
    status: 'pending',
    currentStep: 0,
    totalSteps: lifiRoute.steps.length || 1,
  };
  transferStatuses.set(transferId, status);

  (async () => {
    try {
      status.status = 'processing';

      const executedRoute = await lifiExecuteRoute(lifiRoute, {
        updateRouteHook(updatedRoute) {
          const activeIdx = updatedRoute.steps.findIndex(
            (s) =>
              s.execution?.status === 'PENDING' ||
              s.execution?.status === 'ACTION_REQUIRED'
          );
          if (activeIdx >= 0) status.currentStep = activeIdx + 1;

          const firstProcs = updatedRoute.steps[0]?.execution?.process ?? [];
          const srcTx = firstProcs.find((p) => p.txHash);
          if (srcTx?.txHash) status.fromTxHash = srcTx.txHash;

          const lastProcs =
            updatedRoute.steps[updatedRoute.steps.length - 1]?.execution?.process ?? [];
          const dstTx = [...lastProcs].reverse().find((p) => p.txHash);
          if (dstTx?.txHash) status.toTxHash = dstTx.txHash;
        },
      });

      const firstProcs = executedRoute.steps[0]?.execution?.process ?? [];
      const srcTx = firstProcs.find((p) => p.txHash);
      if (srcTx?.txHash) status.fromTxHash = srcTx.txHash;

      const lastProcs =
        executedRoute.steps[executedRoute.steps.length - 1]?.execution?.process ?? [];
      const dstTx = [...lastProcs].reverse().find((p) => p.txHash);
      if (dstTx?.txHash) status.toTxHash = dstTx.txHash;

      status.status = 'completed';
      status.currentStep = status.totalSteps;
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }
  })();

  return transferId;
}

export function getTransferStatus(transferId: string): TransferStatus | undefined {
  return transferStatuses.get(transferId);
}

// ============================================================================
// Balance Aggregation
// ============================================================================

export async function getAggregatedBalances(address: string): Promise<AggregatedBalance[]> {
  // Build Li.Fi-compatible token list for all supported chains.
  // priceUSD is required by the Li.Fi Token type; actual prices come back in the response.
  const tokensByChain: Record<number, Array<Token & { priceUSD: string }>> = {};
  for (const [chainIdStr, tokens] of Object.entries(COMMON_TOKENS)) {
    tokensByChain[parseInt(chainIdStr)] = tokens.map((t) => ({ ...t, priceUSD: '0' }));
  }

  let balancesByChain: Record<number, import('@lifi/types').TokenAmount[]>;
  try {
    balancesByChain = await getTokenBalancesByChain(
      address,
      tokensByChain as Record<number, import('@lifi/types').Token[]>
    );
  } catch (err) {
    logger.error(
      'Failed to fetch token balances from Li.Fi',
      err instanceof Error ? err : new Error(String(err))
    );
    return [];
  }

  const aggregate = new Map<string, AggregatedBalance>();
  for (const [chainIdStr, tokenAmounts] of Object.entries(balancesByChain)) {
    const chainId = parseInt(chainIdStr);
    for (const ta of tokenAmounts) {
      if (!ta.amount) continue;
      const humanAmount = Number(ta.amount) / Math.pow(10, ta.decimals);
      const usdValue = parseFloat(ta.priceUSD ?? '0') * humanAmount;
      const token: Token = {
        address: ta.address,
        symbol: ta.symbol,
        name: ta.name,
        decimals: ta.decimals,
        chainId,
        logoUri: ta.logoURI,
      };
      const balance: Balance = { chainId, token, balance: humanAmount.toString(), usdValue };
      const existing = aggregate.get(ta.symbol);
      if (existing) {
        existing.byChain.push(balance);
        existing.totalUsdValue += usdValue;
        existing.totalBalance = (parseFloat(existing.totalBalance) + humanAmount).toString();
      } else {
        aggregate.set(ta.symbol, {
          token: ta.symbol,
          totalBalance: humanAmount.toString(),
          totalUsdValue: usdValue,
          byChain: [balance],
        });
      }
    }
  }
  return Array.from(aggregate.values());
}

// ============================================================================
// React Hook
// ============================================================================

export function useCrossChain(userAddress: string | undefined, walletClient?: WalletClient) {
  const [balances, setBalances] = useState<AggregatedBalance[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<TransferStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load balances
  useEffect(() => {
    if (!userAddress) return;

    getAggregatedBalances(userAddress)
      .then(setBalances)
      .catch((err: unknown) =>
        logger.error(
          'Failed to load aggregated balances',
          err instanceof Error ? err : new Error(String(err))
        )
      );
  }, [userAddress]);

  const findOptimalRoutes = useCallback(async (request: TransferRequest) => {
    setLoading(true);
    setError(null);

    try {
      const foundRoutes = await findRoutes(request);
      setRoutes(foundRoutes);
      return foundRoutes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find routes';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const initiateTransfer = useCallback(
    async (route: Route, request: TransferRequest) => {
      if (!walletClient) {
        setError('Wallet not connected. Please connect your wallet before initiating a transfer.');
        return null;
      }
      setLoading(true);
      setError(null);

      try {
        const transferId = await executeTransfer(route, request, walletClient);

        const interval = setInterval(() => {
          const status = getTransferStatus(transferId);
          if (status) {
            setCurrentTransfer(status);
            if (status.status === 'completed' || status.status === 'failed') {
              clearInterval(interval);
              setLoading(false);
            }
          }
        }, 1000);

        return transferId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transfer failed';
        setError(message);
        setLoading(false);
        return null;
      }
    },
    [walletClient]
  );

  const getChain = useCallback((chainId: number) => {
    return SUPPORTED_CHAINS.find((c) => c.id === chainId);
  }, []);

  const getToken = useCallback((chainId: number, symbolOrAddress: string) => {
    const tokens = COMMON_TOKENS[chainId] || [];
    return tokens.find(
      (t) =>
        t.address.toLowerCase() === symbolOrAddress.toLowerCase() ||
        t.symbol.toLowerCase() === symbolOrAddress.toLowerCase()
    );
  }, []);

  return {
    balances,
    routes,
    currentTransfer,
    loading,
    error,
    supportedChains: SUPPORTED_CHAINS,
    findOptimalRoutes,
    initiateTransfer,
    getChain,
    getToken,
    refreshBalances: () => userAddress && getAggregatedBalances(userAddress).then(setBalances),
  };
}

export default useCrossChain;
