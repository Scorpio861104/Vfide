/**
 * Cryptocurrency & Payment Integration
 * 
 * Seamlessly blend crypto payments with social interactions.
 */

import { useState, useEffect, useCallback } from 'react';
import { parseEther, formatEther } from 'viem';
// Crypto validation types - ValidationError used in type definitions
import type { ValidationError as _ValidationError } from './cryptoValidation';
import { getEthereumProvider, assertCorrectChain, assertNonZeroAddress, waitForTransactionReceiptSuccess } from './cryptoApprovals';
import { logger } from '@/lib/logger';

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${name} from provider`);
  }
  return value;
}

function asStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Invalid ${name} from provider`);
  }
  return value;
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Wallet {
  address: string;
  balance: string;
  tokenBalance: string; // VFIDE token balance
  usdValue: number;
  ensName?: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'tip' | 'reward' | 'payment_request' | 'group_payment';
  from: string;
  to: string;
  amount: string;
  tokenAmount?: string;
  currency: 'ETH' | 'VFIDE';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  txHash?: string;
  messageId?: string; // Link to message if payment was in chat
  conversationId?: string;
  groupId?: string;
  memo?: string;
}

export interface PaymentRequest {
  id: string;
  from: string; // Requester
  to: string; // Payer
  amount: string;
  currency: 'ETH' | 'VFIDE';
  reason: string;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  messageId: string;
  conversationId: string;
  createdAt: number;
  expiresAt: number;
}

export interface CryptoBadge {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  mintedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  achievement?: string;
}

// ============================================================================
// Wallet Management
// ============================================================================

/**
 * Connect wallet (MetaMask, WalletConnect, etc.)
 */
export async function connectWallet(): Promise<Wallet> {
  const provider = getEthereumProvider();

  try {
    // Request accounts
    const accounts = asStringArray(await provider.request({
      method: 'eth_requestAccounts',
    }), 'accounts');

    const address = accounts[0];
    if (!address) {
      throw new Error('No wallet account available');
    }

    // Get balance
    const balance = asString(await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }), 'balance');

    // Convert wei to ETH using BigInt to avoid float64 precision loss above 0.009 ETH
    let balanceWeiBig: bigint;
    try {
      balanceWeiBig = BigInt(balance);
    } catch {
      throw new Error('Invalid balance format from provider');
    }
    const ethBalance = Number(formatEther(balanceWeiBig));

    // Get VFIDE token balance
    const tokenBalance = await getTokenBalance(address);

    // Get USD value
    const usdValue = await getUsdValue(ethBalance);

    // Try to get ENS name
    const ensName = await resolveEns(address);

    return {
      address,
      balance: ethBalance.toFixed(4),
      tokenBalance,
      usdValue,
      ensName,
    };
  } catch (error) {
    logger.error('Wallet connection error:', error);
    throw new Error('Failed to connect wallet');
  }
}

/**
 * Get VFIDE token balance
 */
async function getTokenBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`/api/crypto/balance/${address}`);
    const data = await response.json();
    return data.tokenBalance || '0';
  } catch {
    return '0';
  }
}

/**
 * Get current USD value
 */
async function getUsdValue(ethAmount: number): Promise<number> {
  try {
    const response = await fetch('/api/crypto/price');
    const data = await response.json();
    if (typeof data.ethPrice !== 'number' || !Number.isFinite(data.ethPrice) || data.ethPrice <= 0) {
      return 0;
    }
    return ethAmount * data.ethPrice;
  } catch {
    return 0;
  }
}

/**
 * Resolve ENS name
 */
async function resolveEns(address: string): Promise<string | undefined> {
  try {
    const response = await fetch(`/api/crypto/ens/${address}`);
    const data = await response.json();
    return data.ensName;
  } catch {
    return undefined;
  }
}

/**
 * Disconnect wallet
 *
 * NOTE: Wallet connection state is managed by wagmi. Use wagmi's `useDisconnect`
 * hook to disconnect. This function is intentionally a no-op to avoid conflicting
 * with wagmi's persister and leaving stale localStorage state.
 * See F-L-02 audit finding.
 */
export function disconnectWallet(): void {
  // Intentionally empty — rely on wagmi's useDisconnect() for all wallet
  // disconnection and storage cleanup. Manual localStorage manipulation here
  // was found to use inconsistent key names, conflicting with wagmi's persister.
}

// ============================================================================
// Payment System
// ============================================================================

/**
 * Send payment in chat
 */
export async function sendPayment(
  to: string,
  amount: string,
  currency: 'ETH' | 'VFIDE',
  options?: {
    messageId?: string;
    conversationId?: string;
    groupId?: string;
    memo?: string;
  }
): Promise<Transaction> {
  try {
    const from = await getCurrentWalletAddress();

    // Create transaction
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,

      type: 'send',
      from,
      to,
      amount,
      currency,
      status: 'pending',
      timestamp: Date.now(),
      ...options,
    };

    // Send transaction
    if (currency === 'ETH') {
      const txHash = await sendEthTransaction(to, amount);
      transaction.txHash = txHash;
    } else {
      const txHash = await sendTokenTransaction(to, amount);
      transaction.txHash = txHash;
    }

    // Save to database
    await saveTransaction(transaction);

    // Send notification
    await notifyPayment(transaction);

    return transaction;
  } catch (error) {
    logger.error('Payment error:', error);
    throw new Error('Payment failed');
  }
}

/**
 * Send ETH transaction
 */
async function sendEthTransaction(to: string, amount: string): Promise<string> {
  const provider = getEthereumProvider();
  assertNonZeroAddress(to, 'recipient');
  await assertCorrectChain();

  // Use viem's parseEther for exact BigInt-based conversion (avoids float64 precision loss)
  let amountWeiBig: bigint;
  try {
    amountWeiBig = parseEther(amount);
  } catch {
    throw new Error('Invalid transaction amount');
  }
  if (amountWeiBig <= 0n) {
    throw new Error('Invalid transaction amount');
  }
  const amountWei = `0x${amountWeiBig.toString(16)}`;

  const txHash = asString(await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        to,
        value: amountWei,
      },
    ],
  }), 'transaction hash');

  await waitForTransactionReceiptSuccess(txHash);
  return txHash;
}

/**
 * Send VFIDE token transaction
 */
async function sendTokenTransaction(to: string, amount: string): Promise<string> {
  // In production, call token contract
  // For now, use API
  const response = await fetch('/api/crypto/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, amount, currency: 'VFIDE' }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Transaction failed');
  }

  return data.txHash;
}

/**
 * Tip a message
 */
export async function tipMessage(
  messageId: string,
  recipientAddress: string,
  amount: string,
  currency: 'ETH' | 'VFIDE'
): Promise<Transaction> {
  const transaction = await sendPayment(recipientAddress, amount, currency, {
    messageId,
    memo: 'Message tip',
  });

  transaction.type = 'tip';

  // Update message with tip
  await fetch('/api/messages/tip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, transaction }),
  });

  return transaction;
}

/**
 * Create payment request
 */
export async function createPaymentRequest(
  to: string,
  amount: string,
  currency: 'ETH' | 'VFIDE',
  reason: string,
  conversationId: string
): Promise<PaymentRequest> {
  const from = await getCurrentWalletAddress();

  const request: PaymentRequest = {
    id: `req_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    from,
    to,
    amount,
    currency,
    reason,
    status: 'pending',
    messageId: '', // Will be set when message is created
    conversationId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Save to database
  const response = await fetch('/api/crypto/payment-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  return data.request;
}

/**
 * Pay payment request
 */
export async function payPaymentRequest(requestId: string): Promise<Transaction> {
  // Get request details
  const response = await fetch(`/api/crypto/payment-requests/${requestId}`);
  const data = await response.json();
  const request: PaymentRequest = data.request;

  // Send payment
  const transaction = await sendPayment(request.from, request.amount, request.currency, {
    messageId: request.messageId,
    conversationId: request.conversationId,
    memo: `Payment for: ${request.reason}`,
  });

  transaction.type = 'payment_request';

  // Update request status
  await fetch(`/api/crypto/payment-requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'paid', transactionId: transaction.id }),
  });

  return transaction;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentWalletAddress(): Promise<string> {
  const provider = getEthereumProvider();

  const accounts = asStringArray(await provider.request({
    method: 'eth_accounts',
  }), 'accounts');

  if (accounts.length === 0) {
    throw new Error('Wallet not connected');
  }

  const address = accounts[0];
  if (!address) {
    throw new Error('Wallet not connected');
  }

  return address;
}

async function saveTransaction(transaction: Transaction): Promise<void> {
  await fetch('/api/crypto/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });
}

async function notifyPayment(transaction: Transaction): Promise<void> {
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'payment',
      userId: transaction.to,
      data: transaction,
    }),
  });
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for wallet connection
 */
export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const connectedWallet = await connectWallet();
      setWallet(connectedWallet);
      localStorage.setItem('vfide_wallet_address', connectedWallet.address);
      localStorage.setItem('vfide_wallet_connected', 'true');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setWallet(null);
  }, []);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('vfide_wallet_connected');
    if (wasConnected === 'true') {
      connect();
    }
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (typeof ethereum !== 'undefined') {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = asStringArray(args[0], 'accountsChanged payload');
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
        }
      };

      // Refresh wallet state on chain switch to avoid stale balance/network context.
      const handleChainChanged = () => {
        connect();
      };

      // Keep app state in sync if provider disconnects unexpectedly.
      const handleDisconnect = () => {
        disconnect();
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('disconnect', handleDisconnect);

      return () => {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
          ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
    return undefined;
  }, [connect, disconnect]);

  return {
    wallet,
    connecting,
    error,
    connect,
    disconnect,
    isConnected: wallet !== null,
  };
}

/**
 * Hook for transaction history
 */
export function useTransactions(userId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch(`/api/crypto/transactions/${userId}`);
        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (error) {
        logger.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();

    // Poll for updates
    const interval = setInterval(fetchTransactions, 30000); // 30s

    return () => clearInterval(interval);
  }, [userId]);

  return { transactions, loading };
}

/**
 * Hook for payment requests
 */
export function usePaymentRequests(userId: string) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetch(`/api/crypto/payment-requests?userId=${userId}`);
        const data = await response.json();
        setRequests(data.requests || []);
      } catch (error) {
        logger.error('Failed to fetch payment requests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();

    const interval = setInterval(fetchRequests, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return { requests, loading };
}
