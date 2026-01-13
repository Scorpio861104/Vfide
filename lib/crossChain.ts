/**
 * Cross-Chain Abstraction Layer
 * 
 * Provides chain-agnostic transfers with automatic bridging and routing.
 * Can integrate with external bridge aggregators or use direct bridges.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

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
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 1 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1 },
    { address: '0x6B175474E89094C44Da98b954EescdeCB5BE3830', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1 },
  ],
  8453: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 8453 },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 8453 },
  ],
  42161: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 42161 },
    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42161 },
  ],
  10: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18, chainId: 10 },
    { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 10 },
  ],
  137: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', name: 'MATIC', decimals: 18, chainId: 137 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137 },
  ],
};

// ============================================================================
// Route Finder
// ============================================================================

/**
 * Find optimal routes for cross-chain transfer
 * In production, this would call bridge aggregators like LI.FI or Socket
 */
export async function findRoutes(request: TransferRequest): Promise<Route[]> {
  const fromChain = SUPPORTED_CHAINS.find((c) => c.id === request.fromChain);
  const toChain = SUPPORTED_CHAINS.find((c) => c.id === request.toChain);

  if (!fromChain || !toChain) {
    throw new Error('Unsupported chain');
  }

  const fromToken = COMMON_TOKENS[request.fromChain]?.find(
    (t) => t.address.toLowerCase() === request.fromToken.toLowerCase() ||
           t.symbol.toLowerCase() === request.fromToken.toLowerCase()
  );

  const toToken = COMMON_TOKENS[request.toChain]?.find(
    (t) => t.address.toLowerCase() === request.toToken.toLowerCase() ||
           t.symbol.toLowerCase() === request.toToken.toLowerCase()
  );

  if (!fromToken || !toToken) {
    throw new Error('Unsupported token');
  }

  // Simulated routes - in production would come from bridge APIs
  const routes: Route[] = [];

  // Same chain - just swap
  if (request.fromChain === request.toChain) {
    if (request.fromToken !== request.toToken) {
      routes.push({
        id: 'swap-dex',
        protocol: 'Uniswap',
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: request.amount,
        toAmount: (parseFloat(request.amount) * 0.997).toString(), // 0.3% fee
        estimatedTime: 30,
        gasCost: { amount: '0.001', usd: 2.5 },
        bridgeFee: { amount: '0', usd: 0 },
        totalCost: 2.5,
        steps: [
          {
            type: 'swap',
            protocol: 'Uniswap',
            fromToken,
            toToken,
            fromAmount: request.amount,
            toAmount: (parseFloat(request.amount) * 0.997).toString(),
            estimatedTime: 30,
          },
        ],
        tags: ['cheapest', 'fastest', 'recommended'],
      });
    } else {
      // Direct transfer
      routes.push({
        id: 'direct',
        protocol: 'Direct',
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: request.amount,
        toAmount: request.amount,
        estimatedTime: 15,
        gasCost: { amount: '0.0005', usd: 1.25 },
        bridgeFee: { amount: '0', usd: 0 },
        totalCost: 1.25,
        steps: [],
        tags: ['cheapest', 'fastest', 'recommended'],
      });
    }
    return routes;
  }

  // Cross-chain - need bridge
  const bridgeOptions = [
    { name: 'Across', fee: 0.1, time: 120 },
    { name: 'Stargate', fee: 0.06, time: 300 },
    { name: 'Hop', fee: 0.15, time: 180 },
    { name: 'Synapse', fee: 0.12, time: 600 },
  ];

  for (const bridge of bridgeOptions) {
    const feeAmount = parseFloat(request.amount) * (bridge.fee / 100);
    const outputAmount = parseFloat(request.amount) - feeAmount;

    routes.push({
      id: `bridge-${bridge.name.toLowerCase()}`,
      protocol: bridge.name,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount: request.amount,
      toAmount: outputAmount.toString(),
      estimatedTime: bridge.time,
      gasCost: { amount: '0.002', usd: 5 },
      bridgeFee: { amount: feeAmount.toString(), usd: feeAmount * 1 }, // Assuming $1 token
      totalCost: 5 + feeAmount,
      steps: [
        {
          type: 'approve',
          protocol: bridge.name,
          fromToken,
          toToken: fromToken,
          fromAmount: request.amount,
          toAmount: request.amount,
          estimatedTime: 15,
        },
        {
          type: 'bridge',
          protocol: bridge.name,
          fromToken,
          toToken,
          fromAmount: request.amount,
          toAmount: outputAmount.toString(),
          estimatedTime: bridge.time - 15,
        },
      ],
      tags: [],
    });
  }

  // Assign tags
  routes.sort((a, b) => a.totalCost - b.totalCost);
  if (routes[0]) routes[0].tags.push('cheapest');

  routes.sort((a, b) => a.estimatedTime - b.estimatedTime);
  if (routes[0]) routes[0].tags.push('fastest');

  // Recommended = balance of cost and time
  routes.sort((a, b) => {
    const scoreA = a.totalCost + a.estimatedTime / 60;
    const scoreB = b.totalCost + b.estimatedTime / 60;
    return scoreA - scoreB;
  });
  if (routes[0]) routes[0].tags.push('recommended');

  return routes;
}

// ============================================================================
// Transfer Execution
// ============================================================================

const transferStatuses = new Map<string, TransferStatus>();

export async function executeTransfer(
  route: Route,
  request: TransferRequest,
  signer: { sendTransaction: (tx: unknown) => Promise<{ hash: string; wait: () => Promise<unknown> }> }
): Promise<string> {
  const transferId = `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const status: TransferStatus = {
    id: transferId,
    status: 'pending',
    currentStep: 0,
    totalSteps: route.steps.length || 1,
  };

  transferStatuses.set(transferId, status);

  // Execute asynchronously
  (async () => {
    try {
      status.status = 'processing';

      for (let i = 0; i < route.steps.length; i++) {
        const step = route.steps[i];
        status.currentStep = i + 1;

        if (step.type === 'approve') {
          // Simulate approval
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else if (step.type === 'swap') {
          // Simulate swap
          const tx = await signer.sendTransaction({
            to: '0x1234...', // DEX router
            data: '0x...', // Swap calldata
          });
          status.fromTxHash = tx.hash;
          await tx.wait();
        } else if (step.type === 'bridge') {
          status.status = 'bridging';
          // Simulate bridge deposit
          const tx = await signer.sendTransaction({
            to: '0x5678...', // Bridge contract
            data: '0x...', // Bridge calldata
          });
          status.fromTxHash = tx.hash;
          await tx.wait();

          // Wait for bridge completion (simulated)
          status.estimatedArrival = Date.now() + step.estimatedTime * 1000;
          await new Promise((resolve) => setTimeout(resolve, step.estimatedTime * 1000));
        }
      }

      status.status = 'completed';
      status.toTxHash = '0x...'; // Would come from bridge
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

export async function getAggregatedBalances(
  _address: string
): Promise<AggregatedBalance[]> {
  const allBalances: Balance[] = [];

  // In production, would query each chain's RPC
  // For now, simulate
  for (const chain of SUPPORTED_CHAINS.filter((c) => !c.isTestnet)) {
    const tokens = COMMON_TOKENS[chain.id] || [];
    for (const token of tokens) {
      // Simulated balance
      const balance = (Math.random() * 100).toFixed(4);
      const usdValue = parseFloat(balance) * (token.symbol === 'ETH' ? 2500 : 1);

      allBalances.push({
        chainId: chain.id,
        token,
        balance,
        usdValue,
      });
    }
  }

  // Aggregate by token symbol
  const aggregated = new Map<string, AggregatedBalance>();

  for (const balance of allBalances) {
    const existing = aggregated.get(balance.token.symbol);
    if (existing) {
      existing.totalBalance = (
        parseFloat(existing.totalBalance) + parseFloat(balance.balance)
      ).toString();
      existing.totalUsdValue += balance.usdValue;
      existing.byChain.push(balance);
    } else {
      aggregated.set(balance.token.symbol, {
        token: balance.token.symbol,
        totalBalance: balance.balance,
        totalUsdValue: balance.usdValue,
        byChain: [balance],
      });
    }
  }

  return Array.from(aggregated.values());
}

// ============================================================================
// React Hook
// ============================================================================

export function useCrossChain(userAddress: string | undefined) {
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
      .catch(console.error);
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

  const initiateTransfer = useCallback(async (
    route: Route,
    request: TransferRequest,
    signer: { sendTransaction: (tx: unknown) => Promise<{ hash: string; wait: () => Promise<unknown> }> }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const transferId = await executeTransfer(route, request, signer);
      
      // Poll for status
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
  }, []);

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
