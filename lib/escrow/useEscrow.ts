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
import { CommerceEscrowABI, CONTRACT_ADDRESSES, VFIDE_TOKEN_ABI } from '@/lib/contracts';

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
}

export type EscrowState = 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

const STATE_MAP: Record<number, EscrowState> = {
  0: 'CREATED',
  1: 'RELEASED',
  2: 'REFUNDED',
  3: 'DISPUTED'
};

export function useEscrow() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const tokenAddress = CONTRACT_ADDRESSES.VFIDEToken;
  const hasEscrowConfig =
    escrowAddress !== '0x0000000000000000000000000000000000000000' &&
    tokenAddress !== '0x0000000000000000000000000000000000000000';

  // Get total escrow count
  const { data: escrowCount, refetch: refetchCount } = useReadContract({
    address: escrowAddress,
    abi: CommerceEscrowABI,
    functionName: 'escrowCount',
    query: {
      enabled: hasEscrowConfig,
    },
  });

  // Contract write hooks
  const { writeContractAsync, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // ============ HELPER FUNCTIONS (defined first) ============

  // Helper: Check token allowance
  const checkAllowance = useCallback(async (owner: `0x${string}`, spender: `0x${string}`): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('Wallet client not available');
    }

    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: VFIDE_TOKEN_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    });

    return allowance as bigint;
  }, [publicClient, tokenAddress]);

  // Helper: Approve token
  const approveToken = useCallback(async (spender: `0x${string}`, amount: bigint) => {
    if (!publicClient) {
      throw new Error('Wallet client not available');
    }

    const approvalHash = await writeContractAsync({
      address: tokenAddress,
      abi: VFIDE_TOKEN_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });

    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }, [publicClient, tokenAddress, writeContractAsync]);

  // Read single escrow
  const readEscrow = useCallback(async (id: bigint): Promise<Escrow> => {
    if (!publicClient) {
      throw new Error('Wallet client not available');
    }

    const data = await publicClient.readContract({
      address: escrowAddress,
      abi: CommerceEscrowABI,
      functionName: 'escrows',
      args: [id],
    });

    const [buyer, merchant, token, amount, createdAt, releaseTime, state, orderId] = data as readonly [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      number,
      string
    ];

    return {
      id,
      buyer,
      merchant,
      token,
      amount,
      createdAt,
      releaseTime,
      state,
      orderId,
    };
  }, [escrowAddress, publicClient]);

  // Format helpers
  const formatEscrowAmount = useCallback((amount: bigint): string => {
    return formatUnits(amount, 18);
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
      throw new Error('Wallet client not available');
    }

    const timeoutData = await publicClient.readContract({
      address: escrowAddress,
      abi: CommerceEscrowABI,
      functionName: 'checkTimeout',
      args: [id],
    });

    const [isNearTimeout, timeRemaining] = timeoutData as readonly [boolean, bigint];

    return {
      isNearTimeout,
      timeRemaining,
    };
  }, [escrowAddress, publicClient]);

  // ============ MAIN FUNCTIONS (use helpers) ============

  // Load all escrows for current user
  const loadEscrows = useCallback(async () => {
    if (!hasEscrowConfig || !escrowCount || !address || !publicClient) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const count = Number(escrowCount);
      const userEscrows: Escrow[] = [];
      
      // Fetch all escrows (in production, use subgraph or indexer)
      for (let i = 1; i <= count; i++) {
        try {
          const escrow = await readEscrow(BigInt(i));
          const normalizedUser = address.toLowerCase();
          if (escrow.buyer.toLowerCase() === normalizedUser || escrow.merchant.toLowerCase() === normalizedUser) {
            userEscrows.push(escrow);
          }
        } catch {
          // Skip invalid escrows
          continue;
        }
      }
      
      setEscrows(userEscrows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrows');
    } finally {
      setLoading(false);
    }
  }, [address, escrowCount, hasEscrowConfig, publicClient, readEscrow]);

  // Create escrow (with automatic token approval)
  const createEscrow = useCallback(async (
    merchant: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (!hasEscrowConfig) throw new Error('Escrow contracts are not configured');
    
    setLoading(true);
    setError(null);

    try {
      const amountWei = parseUnits(amount, 18);
      
      // Step 1: Check/request token approval
      const allowance = await checkAllowance(address, escrowAddress);
      if (allowance < amountWei) {
        await approveToken(escrowAddress, amountWei);
        // Wait for approval confirmation
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 2: Create escrow
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'createEscrow',
        args: [merchant, tokenAddress, amountWei, orderId],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, approveToken, checkAllowance, escrowAddress, hasEscrowConfig, tokenAddress, writeContractAsync]);

  // Release funds to merchant
  const releaseEscrow = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'release',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Refund buyer (merchant initiated)
  const refundEscrow = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'refund',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Claim timeout (merchant claims after release time)
  const claimTimeout = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'claimTimeout',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Raise dispute
  const raiseDispute = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'raiseDispute',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Resolve dispute (DAO arbiter)
  const resolveDispute = useCallback(async (id: bigint, refundBuyer: boolean) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'resolveDispute',
        args: [id, refundBuyer],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Resolve dispute with split payout (DAO arbiter)
  const resolveDisputePartial = useCallback(async (id: bigint, buyerShareBps: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'resolveDisputePartial',
        args: [id, buyerShareBps],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute with split payout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // Notify near-timeout to trigger event-driven monitoring
  const notifyTimeout = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'notifyTimeout',
        args: [id],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrowAddress, writeContractAsync]);

  // ============ EFFECTS ============

  // Auto-reload after successful transaction
  useEffect(() => {
    if (isSuccess) {
      refetchCount();
      loadEscrows();
    }
  }, [isSuccess, refetchCount, loadEscrows]);

  // Initial and dependency-driven load
  useEffect(() => {
    loadEscrows();
  }, [loadEscrows]);

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
    resolveDispute,
    resolveDisputePartial,
    notifyTimeout,
    checkTimeout,
    refresh: loadEscrows,
    
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
