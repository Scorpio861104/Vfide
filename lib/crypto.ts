/**
 * Cryptocurrency & Payment Integration
 * 
 * Seamlessly blend crypto payments with social interactions.
 */

import { useState, useEffect, useCallback } from 'react';
// Crypto validation types - ValidationError used in type definitions
import type { ValidationError as _ValidationError } from './cryptoValidation';

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

export interface TokenReward {
  id: string;
  userId: string;
  action: 'message_sent' | 'reaction_given' | 'group_created' | 'member_invited' | 'content_shared' | 'daily_login';
  amount: string;
  timestamp: number;
  claimed: boolean;
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
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }

  try {
    // Request accounts
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    const address = accounts[0];

    // Get balance
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });

    // Convert wei to ETH
    const ethBalance = parseInt(balance, 16) / 1e18;

    // Get VFIDE token balance (mock for now)
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
    console.error('Wallet connection error:', error);
    throw new Error('Failed to connect wallet');
  }
}

/**
 * Get VFIDE token balance
 */
async function getTokenBalance(address: string): Promise<string> {
  // In production, call token contract
  // For now, return mock data from API
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
    // In production, call price API (CoinGecko, etc.)
    const response = await fetch('/api/crypto/price');
    const data = await response.json();
    return ethAmount * (data.ethPrice || 2000);
  } catch {
    return ethAmount * 2000; // Fallback price
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
 */
export function disconnectWallet(): void {
  // Clear stored wallet data
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('wallet_connected');
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
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    console.error('Payment error:', error);
    throw new Error('Payment failed');
  }
}

/**
 * Send ETH transaction
 */
async function sendEthTransaction(to: string, amount: string): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }

  const amountWei = '0x' + (parseFloat(amount) * 1e18).toString(16);

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        to,
        value: amountWei,
      },
    ],
  });

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
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
// Token Rewards System
// ============================================================================

/**
 * Reward tokens for engagement
 */
export async function rewardTokens(
  userId: string,
  action: TokenReward['action'],
  amount: string = '10'
): Promise<TokenReward> {
  const reward: TokenReward = {
    id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    action,
    amount,
    timestamp: Date.now(),
    claimed: false,
  };

  // Save to database
  await fetch('/api/crypto/rewards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reward),
  });

  return reward;
}

/**
 * Claim rewards
 */
export async function claimRewards(userId: string): Promise<TokenReward[]> {
  const response = await fetch(`/api/crypto/rewards/${userId}/claim`, {
    method: 'POST',
  });

  const data = await response.json();
  return data.rewards;
}

/**
 * Get pending rewards
 */
export async function getPendingRewards(userId: string): Promise<TokenReward[]> {
  const response = await fetch(`/api/crypto/rewards/${userId}?status=pending`);
  const data = await response.json();
  return data.rewards;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentWalletAddress(): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Wallet not connected');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_accounts',
  });

  if (accounts.length === 0) {
    throw new Error('Wallet not connected');
  }

  return accounts[0];
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
      localStorage.setItem('wallet_address', connectedWallet.address);
      localStorage.setItem('wallet_connected', 'true');
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
    const wasConnected = localStorage.getItem('wallet_connected');
    if (wasConnected === 'true') {
      connect();
    }
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
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
        console.error('Failed to fetch transactions:', error);
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
        console.error('Failed to fetch payment requests:', error);
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

/**
 * Hook for token rewards
 */
export function useRewards(userId: string) {
  const [rewards, setRewards] = useState<TokenReward[]>([]);
  const [totalUnclaimed, setTotalUnclaimed] = useState('0');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/crypto/rewards/${userId}`);
      const data = await response.json();
      setRewards(data.rewards || []);
      
      // Calculate total unclaimed
      const unclaimed = data.rewards
        .filter((r: TokenReward) => !r.claimed)
        .reduce((sum: number, r: TokenReward) => sum + parseFloat(r.amount), 0);
      setTotalUnclaimed(unclaimed.toFixed(2));
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = useCallback(async () => {
    try {
      await claimRewards(userId);
      await refresh();
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      throw error;
    }
  }, [userId, refresh]);

  return { rewards, totalUnclaimed, loading, refresh, claim };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
