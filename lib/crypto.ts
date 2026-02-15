/**
 * Cryptocurrency & Payment Integration
 * 
 * Seamlessly blend crypto payments with social interactions.
 */

import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, formatUnits, isAddress, parseUnits } from 'viem';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';
import { isSupportedChainId } from '@/lib/chains';
import { ZERO_ADDRESS } from './constants';
// Crypto validation types - ValidationError used in type definitions
import type { ValidationError as _ValidationError } from './cryptoValidation';

/** Generate a crypto-safe hex ID */
function secureId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
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
  currency: 'ETH' | 'VFIDE' | 'USDC' | 'USDT' | 'DAI';
  reason: string;
  status: 'pending' | 'paid' | 'declined' | 'expired' | 'cancelled';
  messageId?: string;
  conversationId?: string;
  createdAt?: number;
  expiresAt?: number;
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

    // Convert wei to ETH using formatUnits to avoid BigInt-to-Number precision loss
    const ethBalance = formatUnits(BigInt(balance), 18);

    // Get VFIDE token balance
    const tokenBalance = await getTokenBalance(address);

    // Get USD value (parseFloat on formatted string is safe — value is human-readable, not raw wei)
    const usdValue = await getUsdValue(parseFloat(ethBalance));

    // Try to get ENS name
    const ensName = await resolveEns(address);

    return {
      address,
      balance: parseFloat(ethBalance).toFixed(4),
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
  // Fetch token balances from the crypto balance API
  try {
    const response = await fetch(`/api/crypto/balance/${address}`);
    if (!response.ok) {
      return '0';
    }
    const data = await response.json();
    const balances = Array.isArray(data.balances) ? data.balances : [];
    const tokenAddress = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS?.toLowerCase();

    if (!tokenAddress) {
      const total = balances.reduce((sum: number, row: { balance?: string }) => {
        const value = parseFloat(row.balance || '0');
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      return total.toString();
    }

    const match = balances.find((row: { token_address?: string }) =>
      row.token_address?.toLowerCase() === tokenAddress
    );

    return match?.balance ? String(match.balance) : '0';
  } catch {
    return '0';
  }
}

  async function buildWriteHeaders(method: string): Promise<HeadersInit> {
    return buildCsrfHeaders({ 'Content-Type': 'application/json' }, method);
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
  // Validate recipient address
  if (!to || !isAddress(to)) {
    throw new Error('Invalid recipient address');
  }

  // Validate amount is a positive finite number
  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Invalid payment amount: must be a positive number');
  }

  try {
    const from = await getCurrentWalletAddress();

    // Balance check before sending
    if (currency === 'ETH') {
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [from, 'latest'],
      });
      const balanceEth = parseFloat(formatUnits(BigInt(balanceHex), 18));
      if (balanceEth < parsedAmount) {
        throw new Error('Insufficient ETH balance');
      }
    } else {
      const tokenBal = await getTokenBalance(from);
      if (parseFloat(tokenBal) < parsedAmount) {
        throw new Error('Insufficient VFIDE token balance');
      }
    }

    // Create transaction
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${secureId()}`,
      type: 'send',
      from,
      to,
      amount,
      currency,
      status: 'pending',
      timestamp: Date.now(),
      ...options,
    };

    // Get current chain ID for transaction
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex, 16);

    // Validate chain ID against supported chains
    if (!isSupportedChainId(currentChainId)) {
      throw new Error(`Unsupported chain (ID: ${currentChainId}). Please switch to a supported network.`);
    }

    // Send transaction
    if (currency === 'ETH') {
      const txHash = await sendEthTransaction(to, amount, from, currentChainId);
      transaction.txHash = txHash;
      transaction.status = 'pending'; // Tx submitted but not yet confirmed
    } else {
      const txHash = await sendTokenTransaction(to, amount);
      transaction.txHash = txHash;
      transaction.status = 'pending'; // Tx submitted but not yet confirmed
    }

    // Save to database with pending status — confirmation should be
    // tracked by a separate indexer/listener polling for tx receipts.
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
async function sendEthTransaction(to: string, amount: string, fromAddress: string, chainId?: number): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }

  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat) || !isFinite(amountFloat) || amountFloat <= 0) {
    throw new Error('Invalid transaction amount');
  }

  // Use parseUnits for precise wei conversion (no floating point loss)
  const amountWei = '0x' + parseUnits(amount, 18).toString(16);

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: fromAddress,
        to,
        value: amountWei,
        chainId: chainId ? `0x${chainId.toString(16)}` : undefined,
      },
    ],
  });

  return txHash;
}

/**
 * Send VFIDE token transaction
 */
async function sendTokenTransaction(to: string, amount: string): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }

  const tokenAddress = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  if (!tokenAddress || tokenAddress === ZERO_ADDRESS) {
    throw new Error('VFIDE token address not configured');
  }

  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat) || !isFinite(amountFloat) || amountFloat <= 0) {
    throw new Error('Invalid transaction amount');
  }

  const amountWei = parseUnits(amount, 18);
  const data = encodeFunctionData({
    abi: [
      {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
      },
    ] as const,
    functionName: 'transfer',
    args: [to as `0x${string}`, amountWei],
  });

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const from = accounts[0];
  if (!from) {
    throw new Error('No wallet address found');
  }

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: tokenAddress,
        data,
      },
    ],
  });

  return txHash;
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
  const tipHeaders = await buildWriteHeaders('POST');
  await fetch('/api/messages/tip', {
    method: 'POST',
    headers: tipHeaders,
    credentials: 'include',
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
  const createHeaders = await buildWriteHeaders('POST');
  const response = await fetch('/api/crypto/payment-requests', {
    method: 'POST',
    headers: createHeaders,
    credentials: 'include',
    body: JSON.stringify({
      toAddress: to,
      amount,
      token: currency,
      memo: reason,
    }),
  });

  const data = await response.json();
  const row = data.request || {};
  return {
    id: String(row.id ?? ''),
    from: row.from_address ?? row.from ?? '',
    to: row.to_address ?? row.to ?? '',
    amount: String(row.amount ?? amount),
    currency: (row.token ?? currency) as PaymentRequest['currency'],
    reason: row.memo ?? reason,
    status: row.status ?? 'pending',
    conversationId,
  };
}

/**
 * Pay payment request
 */
export async function payPaymentRequest(requestId: string): Promise<Transaction> {
  // Get request details
  const response = await fetch(`/api/crypto/payment-requests/${requestId}`);
  const data = await response.json();
  const request: PaymentRequest = {
    id: String(data.request?.id ?? requestId),
    from: data.request?.from_address ?? data.request?.from ?? '',
    to: data.request?.to_address ?? data.request?.to ?? '',
    amount: String(data.request?.amount ?? '0'),
    currency: (data.request?.token ?? data.request?.currency ?? 'ETH') as PaymentRequest['currency'],
    reason: data.request?.memo ?? data.request?.reason ?? '',
    status: data.request?.status ?? 'pending',
    messageId: data.request?.message_id,
    conversationId: data.request?.conversation_id,
  };

  // Send payment
  const transaction = await sendPayment(request.from, request.amount, request.currency as 'ETH' | 'VFIDE', {
    messageId: request.messageId,
    conversationId: request.conversationId,
    memo: request.reason ? `Payment for: ${request.reason}` : 'Payment request',
  });

  transaction.type = 'payment_request';

  // Update request status
  const patchHeaders = await buildWriteHeaders('PATCH');
  await fetch(`/api/crypto/payment-requests/${requestId}`, {
    method: 'PATCH',
    headers: patchHeaders,
    credentials: 'include',
    body: JSON.stringify({ status: 'paid', txHash: transaction.txHash ?? transaction.id }),
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
    id: `reward_${Date.now()}_${secureId()}`,
    userId,
    action,
    amount,
    timestamp: Date.now(),
    claimed: false,
  };

  // Save to database
  const rewardHeaders = await buildWriteHeaders('POST');
  await fetch('/api/crypto/rewards', {
    method: 'POST',
    headers: rewardHeaders,
    credentials: 'include',
    body: JSON.stringify(reward),
  });

  return reward;
}

/**
 * Claim rewards
 */
export async function claimRewards(userId: string, rewardIds?: string[]): Promise<TokenReward[]> {
  let ids = rewardIds;

  if (!ids || ids.length === 0) {
    const rewardsResponse = await fetch(`/api/crypto/rewards/${userId}`);
    const rewardsData = await rewardsResponse.json();
    ids = (rewardsData.rewards || [])
      .filter((r: TokenReward) => {
        const status = (r as { status?: string }).status;
        return status === 'pending' || !r.claimed;
      })
      .map((r: TokenReward) => r.id);
  }

  if (!ids || ids.length === 0) {
    return [];
  }

  const claimHeaders = await buildWriteHeaders('POST');
  const response = await fetch(`/api/crypto/rewards/${userId}/claim`, {
    method: 'POST',
    headers: claimHeaders,
    credentials: 'include',
    body: JSON.stringify({ rewardIds: ids }),
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
  const txHeaders = await buildWriteHeaders('POST');
  await fetch('/api/crypto/transactions', {
    method: 'POST',
    headers: txHeaders,
    credentials: 'include',
    body: JSON.stringify(transaction),
  });
}

async function notifyPayment(transaction: Transaction): Promise<void> {
  const notificationHeaders = await buildWriteHeaders('POST');
  await fetch('/api/notifications', {
    method: 'POST',
    headers: notificationHeaders,
    credentials: 'include',
    body: JSON.stringify({
      type: 'payment',
      userAddress: transaction.to,
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
export function usePaymentRequests(userAddress: string) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const response = await fetch(`/api/crypto/payment-requests?userAddress=${userAddress}`);
        const data = await response.json();
        const mapped = Array.isArray(data.requests)
          ? data.requests.map((row: Record<string, unknown>) => ({
              id: String(row.id ?? ''),
              from: row.from_address ?? row.from ?? '',
              to: row.to_address ?? row.to ?? '',
              amount: String(row.amount ?? '0'),
              currency: (row.token ?? 'ETH') as PaymentRequest['currency'],
              reason: row.memo ?? '',
              status: row.status ?? 'pending',
            }))
          : [];
        setRequests(mapped);
      } catch (error) {
        console.error('Failed to fetch payment requests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();

    const interval = setInterval(fetchRequests, 30000);

    return () => clearInterval(interval);
  }, [userAddress]);

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
        .filter((r: TokenReward) => (r as { status?: string }).status === 'pending' || !r.claimed)
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
