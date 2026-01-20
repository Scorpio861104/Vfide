/**
 * Crypto and Web3-specific TypeScript type definitions
 */

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  gasLimit: bigint;
  gasPrice: bigint;
  nonce: number;
  chainId: number;
  status: TransactionStatus;
  blockNumber?: number;
  timestamp?: Date;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'dropped';

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: boolean;
  logs: TransactionLog[];
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

// ============================================================================
// Token & Balance Types
// ============================================================================

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  formattedBalance: string;
  usdValue?: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: bigint;
  chainId: number;
}

export interface TokenTransfer {
  from: string;
  to: string;
  value: bigint;
  tokenAddress: string;
  transactionHash: string;
  timestamp: Date;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface PaymentRequest {
  id: string;
  payerAddress: string;
  payeeAddress: string;
  amount: bigint;
  tokenAddress?: string;
  description?: string;
  status: PaymentStatus;
  createdAt: Date;
  expiresAt?: Date;
}

export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'expired';

export interface FeeEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCost: bigint;
  formattedCost: string;
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface WalletInfo {
  address: string;
  balance: bigint;
  chainId: number;
  network: string;
  connected: boolean;
}

export interface WalletConnection {
  address: string;
  connector: string;
  chainId: number;
}

// ============================================================================
// Contract Types
// ============================================================================

export interface ContractCall {
  address: string;
  abi: unknown[];
  functionName: string;
  args?: unknown[];
}

export interface ContractWrite extends ContractCall {
  value?: bigint;
  gasLimit?: bigint;
}
