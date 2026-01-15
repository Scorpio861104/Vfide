/**
 * useEscrow - Production-grade escrow hook
 * 
 * Provides a clean interface for all escrow operations with:
 * - Automatic token approval handling
 * - Real-time state synchronization
 * - Error handling and user feedback
 * - Type-safe contract interactions
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { readContract } from 'wagmi/actions';
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
}

export type EscrowState = 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export enum EscrowStateValue {
  CREATED = 0,
  RELEASED = 1,
  REFUNDED = 2,
  DISPUTED = 3,
}

const STATE_MAP: Record<number, EscrowState> = {
  [EscrowStateValue.CREATED]: 'CREATED',
  [EscrowStateValue.RELEASED]: 'RELEASED',
  [EscrowStateValue.REFUNDED]: 'REFUNDED',
  [EscrowStateValue.DISPUTED]: 'DISPUTED',
};

export function useEscrow() {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const checkAllowance = useCallback(async (owner: `0x${string}`, spender: `0x${string}`): Promise<bigint> => {
    try {
      // Read allowance from token contract
      const allowance = await readContract(config, {
        address: tokenAddress,
        abi: VFIDE_TOKEN_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });
      return allowance as bigint;
    } catch (error) {
      console.error('Failed to check allowance:', error);
      return BigInt(0);
    }
  }, [config, tokenAddress]);

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
    try {
      // Read escrow data from contract
      const escrowData = await readContract(config, {
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'escrows',
        args: [id],
      });

      // Parse the tuple response
      const [buyer, merchant, token, amount, createdAt, releaseTime, state, orderId] = escrowData as [
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
    } catch (error) {
      console.error(`Failed to read escrow ${id}:`, error);
      // Return a safe default for invalid escrows
      throw new Error('Escrow not found');
    }
  }, [config, escrowAddress]);

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
    try {
      // Read timeout status from contract
      const result = await readContract(config, {
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'checkTimeout',
        args: [id],
      });

      const [isNearTimeout, timeRemaining] = result as [boolean, bigint];

      return {
        isNearTimeout,
        timeRemaining,
      };
    } catch (error) {
      console.error('Failed to check timeout:', error);
      return {
        isNearTimeout: false,
        timeRemaining: BigInt(0),
      };
    }
  }, [config, escrowAddress]);

  // ============ MAIN FUNCTIONS (use helpers) ============

  // Load all escrows for current user
  const loadEscrows = useCallback(async () => {
    if (!escrowCount || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const count = Number(escrowCount);
      const userEscrows: Escrow[] = [];
      
      // Fetch all escrows (in production, use subgraph or indexer)
      for (let i = 1; i <= count; i++) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrows');
    } finally {
      setLoading(false);
    }
  }, [escrowCount, address, readEscrow]);

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
      const amountWei = parseUnits(amount, 18);
      
      // Step 1: Check/request token approval
      const allowance = await checkAllowance(address, escrowAddress);
      if (allowance < amountWei) {
        await approveToken(escrowAddress, amountWei);
        // Wait for approval confirmation
        await new Promise(resolve => setTimeout(resolve, 3000));
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
        functionName: 'release',
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
        functionName: 'refund',
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

  const activeEscrows = useMemo(() => escrows.filter((e: Escrow) => e.state === EscrowStateValue.CREATED), [escrows]);
  const completedEscrows = useMemo(() => escrows.filter((e: Escrow) => e.state === EscrowStateValue.RELEASED || e.state === EscrowStateValue.REFUNDED), [escrows]);
  const disputedEscrows = useMemo(() => escrows.filter((e: Escrow) => e.state === EscrowStateValue.DISPUTED), [escrows]);

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
