/**
 * useEscrow - Production-grade escrow hook
 * 
 * Provides a clean interface for all escrow operations with:
 * - Automatic token approval handling
 * - Real-time state synchronization
 * - Error handling and user feedback
 * - Type-safe contract interactions
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { ESCROW_ABI, VFIDE_TOKEN_ABI } from './abis';
import { getEscrowAddress, getTokenAddress } from './addresses';

export interface Escrow {
  id: bigint;
  buyer: `0x${string}`;
  merchant: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  releaseTime: bigint;
  state: number;
  orderId: string;
  buyerReleaseApproved?: boolean;
  merchantReleaseApproved?: boolean;
  buyerRefundApproved?: boolean;
  merchantRefundApproved?: boolean;
}

export type EscrowState = 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

const STATE_MAP: Record<number, EscrowState> = {
  0: 'CREATED',
  1: 'RELEASED',
  2: 'REFUNDED',
  3: 'DISPUTED'
};

export function useEscrow() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [oldestLoadedId, setOldestLoadedId] = useState<number | null>(null);

  const escrowAddress = getEscrowAddress(chainId);
  const tokenAddress = getTokenAddress(chainId);

  // Get total escrow count
  const { data: escrowCount, refetch: refetchCount } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'escrowCount',
  });

  // Contract write hooks
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // ============ HELPER FUNCTIONS (defined first) ============

  // Helper: Check token allowance
  // Parameters prefixed with _ as they're reserved for future contract read implementation
  const checkAllowance = useCallback(async (owner: `0x${string}`, spender: `0x${string}`): Promise<bigint> => {
    if (!publicClient) return 0n;
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: VFIDE_TOKEN_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });
      return typeof allowance === 'bigint' ? allowance : BigInt(allowance as unknown as string);
    } catch {
      return 0n;
    }
  }, [publicClient, tokenAddress]);

  // Helper: Approve token
  const approveToken = useCallback(async (spender: `0x${string}`, amount: bigint) => {
    writeContract({
      address: tokenAddress,
      abi: VFIDE_TOKEN_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
  }, [tokenAddress, writeContract]);

  // Read single escrow
  const readEscrow = useCallback(async (id: bigint): Promise<Escrow> => {
    if (!publicClient) {
      throw new Error('No public client available');
    }

    const result = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'escrows',
      args: [id],
    });

    const [buyer, merchant, token, amount, createdAt, releaseTime, state, orderId] = Array.isArray(result)
      ? result
      : [
          (result as { buyer?: unknown }).buyer,
          (result as { merchant?: unknown }).merchant,
          (result as { token?: unknown }).token,
          (result as { amount?: unknown }).amount,
          (result as { createdAt?: unknown }).createdAt,
          (result as { releaseTime?: unknown }).releaseTime,
          (result as { state?: unknown }).state,
          (result as { orderId?: unknown }).orderId,
        ];

    const [buyerReleaseApproved, merchantReleaseApproved, buyerRefundApproved, merchantRefundApproved] = await Promise.all([
      publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'buyerReleaseApproved',
        args: [id],
      }).catch(() => false),
      publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'merchantReleaseApproved',
        args: [id],
      }).catch(() => false),
      publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'buyerRefundApproved',
        args: [id],
      }).catch(() => false),
      publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'merchantRefundApproved',
        args: [id],
      }).catch(() => false),
    ]);

    return {
      id,
      buyer: buyer as `0x${string}`,
      merchant: merchant as `0x${string}`,
      token: token as `0x${string}`,
      amount: amount as bigint,
      createdAt: createdAt as bigint,
      releaseTime: releaseTime as bigint,
      state: typeof state === 'number' ? state : Number(state),
      orderId: String(orderId ?? ''),
      buyerReleaseApproved: Boolean(buyerReleaseApproved),
      merchantReleaseApproved: Boolean(merchantReleaseApproved),
      buyerRefundApproved: Boolean(buyerRefundApproved),
      merchantRefundApproved: Boolean(merchantRefundApproved),
    };
  }, [publicClient, escrowAddress]);

  // Format helpers — VFIDE token uses 18 decimals
  const TOKEN_DECIMALS = 18;

  const formatEscrowAmount = useCallback((amount: bigint): string => {
    return formatUnits(amount, TOKEN_DECIMALS);
  }, []);

  const getStateLabel = useCallback((state: number): EscrowState => {
    return STATE_MAP[state] || 'CREATED';
  }, []);

  const getTimeRemaining = useCallback((releaseTime: bigint): string => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const diff = releaseTime - now;
    
    if (diff <= 0) return 'Ready to claim';
    
    const days = Number(diff) / 86400;
    const hours = (Number(diff) % 86400) / 3600;
    
    if (days >= 1) return `${Math.floor(days)}d ${Math.floor(hours)}h`;
    return `${Math.floor(hours)}h`;
  }, []);

  // Check timeout status
  const checkTimeout = useCallback(async (id: bigint): Promise<{
    isNearTimeout: boolean;
    timeRemaining: bigint;
  }> => {
    if (!publicClient) {
      return {
        isNearTimeout: false,
        timeRemaining: 0n,
      };
    }

    const result = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'checkTimeout',
      args: [id],
    });

    const [isNearTimeout, timeRemaining] = Array.isArray(result)
      ? result
      : [
          (result as { isNearTimeout?: unknown }).isNearTimeout,
          (result as { timeRemaining?: unknown }).timeRemaining,
        ];

    return {
      isNearTimeout: Boolean(isNearTimeout),
      timeRemaining: (timeRemaining as bigint) ?? 0n,
    };
  }, [publicClient, escrowAddress]);

  // ============ MAIN FUNCTIONS (use helpers) ============

  // Load escrows for current user with pagination (most recent first)
  const MAX_ESCROWS_PER_PAGE = 50;

  const loadEscrows = useCallback(async () => {
    if (!escrowCount || !address) return;

    setLoading(true);
    setError(null);

    try {
      const count = Number(escrowCount);
      const userEscrows: Escrow[] = [];

      // Load only the most recent MAX_ESCROWS_PER_PAGE escrows
      const startId = Math.max(1, count - MAX_ESCROWS_PER_PAGE + 1);
      for (let i = startId; i <= count; i++) {
        try {
          const escrow = await readEscrow(BigInt(i));
          if (escrow.buyer === address || escrow.merchant === address) {
            userEscrows.push(escrow);
          }
        } catch {
          // Skip invalid escrows
          continue;
        }
      }

      setEscrows(userEscrows);
      setOldestLoadedId(startId);
      setHasMore(startId > 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrows');
    } finally {
      setLoading(false);
    }
  }, [escrowCount, address, readEscrow]);

  // Load older escrows (pagination)
  const loadMore = useCallback(async () => {
    if (!oldestLoadedId || oldestLoadedId <= 1 || !address) return;

    setLoading(true);
    setError(null);

    try {
      const endId = oldestLoadedId - 1;
      const startId = Math.max(1, endId - MAX_ESCROWS_PER_PAGE + 1);
      const olderEscrows: Escrow[] = [];

      for (let i = startId; i <= endId; i++) {
        try {
          const escrow = await readEscrow(BigInt(i));
          if (escrow.buyer === address || escrow.merchant === address) {
            olderEscrows.push(escrow);
          }
        } catch {
          continue;
        }
      }

      setEscrows(prev => [...prev, ...olderEscrows]);
      setOldestLoadedId(startId);
      setHasMore(startId > 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more escrows');
    } finally {
      setLoading(false);
    }
  }, [oldestLoadedId, address, readEscrow]);

  // Create escrow (with automatic token approval)
  const createEscrow = useCallback(async (
    merchant: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    if (!address) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const amountWei = parseUnits(amount, TOKEN_DECIMALS);
      
      // Step 1: Check/request token approval
      const allowance = await checkAllowance(address, escrowAddress);
      if (allowance < amountWei) {
        await approveToken(escrowAddress, amountWei);
        // Poll for approval confirmation instead of arbitrary delay
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const newAllowance = await checkAllowance(address, escrowAddress);
          if (newAllowance >= amountWei) break;
          if (i === maxAttempts - 1) {
            throw new Error('Token approval not confirmed after timeout');
          }
        }
      }

      // Step 2: Create escrow
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'createEscrow',
        args: [merchant, tokenAddress, amountWei, orderId],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, escrowAddress, tokenAddress, writeContract, approveToken, checkAllowance]);

  // Release funds to merchant
  const releaseEscrow = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'approveRelease',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContract]);

  // Refund buyer (merchant initiated)
  const refundEscrow = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'approveRefund',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContract]);

  // Claim timeout (merchant claims after release time)
  const claimTimeout = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'claimTimeout',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContract]);

  // Raise dispute
  const raiseDispute = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'raiseDispute',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContract]);

  // ============ EFFECTS ============

  // Auto-reload after successful transaction
  useEffect(() => {
    if (isSuccess) {
      refetchCount();
      loadEscrows();
    }
  }, [isSuccess, refetchCount, loadEscrows]);

  // Error handling
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
    }
  }, [writeError]);

  // ============ COMPUTED VALUES ============

  const activeEscrows = useMemo(() => escrows.filter(e => e.state === 0), [escrows]);
  const completedEscrows = useMemo(() => escrows.filter(e => e.state === 1 || e.state === 2), [escrows]);
  const disputedEscrows = useMemo(() => escrows.filter(e => e.state === 3), [escrows]);

  return {
    // Data
    escrows,
    loading: loading || isPending || isConfirming,
    error,
    isSuccess,
    
    // Actions
    createEscrow,
    releaseEscrow,
    refundEscrow,
    claimTimeout,
    raiseDispute,
    checkTimeout,
    refresh: loadEscrows,
    loadMore,
    hasMore,
    
    // Helpers
    formatEscrowAmount,
    getStateLabel,
    getTimeRemaining,
    
    // State filters
    activeEscrows,
    completedEscrows,
    disputedEscrows,
  };
}
