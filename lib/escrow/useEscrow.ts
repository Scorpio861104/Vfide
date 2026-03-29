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
import { parseUnits, formatUnits, keccak256, stringToHex } from 'viem';
import { ACTIVE_VAULT_ABI, CommerceEscrowABI, CONTRACT_ADDRESSES, VFIDETokenABI } from '@/lib/contracts';

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
  1: 'CREATED',  // OPEN
  2: 'CREATED',  // FUNDED
  3: 'RELEASED',
  4: 'REFUNDED',
  5: 'DISPUTED',
  6: 'RELEASED', // RESOLVED
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
      abi: VFIDETokenABI,
      functionName: 'allowance',
      args: [owner, spender],
    });

    return allowance as bigint;
  }, [publicClient, tokenAddress]);

  // Helper: Approve token spending from the caller's vault
  const approveToken = useCallback(async (vaultAddress: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
    if (!publicClient) {
      throw new Error('Wallet client not available');
    }

    const approvalHash = await writeContractAsync({
      address: vaultAddress,
      abi: ACTIVE_VAULT_ABI,
      functionName: 'approveVFIDE',
      args: [spender, amount],
    });

    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }, [publicClient, writeContractAsync]);

  // Helper: Read required vault/spender pair from CommerceEscrow
  const getRequiredApproval = useCallback(async (owner: `0x${string}`): Promise<{ buyerVault: `0x${string}`; spender: `0x${string}` }> => {
    if (!publicClient) {
      throw new Error('Wallet client not available');
    }

    const approvalData = await publicClient.readContract({
      address: escrowAddress,
      abi: CommerceEscrowABI,
      functionName: 'getRequiredApproval',
      args: [owner],
    });

    const [buyerVault, spender] = approvalData as readonly [`0x${string}`, `0x${string}`];
    return { buyerVault, spender };
  }, [escrowAddress, publicClient]);

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

    const [buyerOwner, merchantOwner, _buyerVault, _sellerVault, amount, state, metaHash] = data as readonly [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      bigint,
      number,
      `0x${string}`
    ];

    return {
      id,
      buyer: buyerOwner,
      merchant: merchantOwner,
      token: tokenAddress,
      amount,
      createdAt: 0n,
      releaseTime: 0n,
      state,
      orderId: metaHash,
    };
  }, [escrowAddress, publicClient, tokenAddress]);

  // Format helpers
  const formatEscrowAmount = useCallback((amount: bigint): string => {
    return formatUnits(amount, 18);
  }, []);

  const getStateLabel = useCallback((state: number): EscrowState => {
    return STATE_MAP[state] || 'CREATED';
  }, []);

  const getTimeRemaining = useCallback((releaseTime: bigint): string => {
    if (releaseTime === 0n) return 'N/A';

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
    // CommerceEscrow does not implement timeout windows like EscrowManager.
    void id;
    const isNearTimeout = false;
    const timeRemaining = 0n;

    return {
      isNearTimeout,
      timeRemaining,
    };
  }, []);

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
      const metaHash = keccak256(stringToHex(orderId || `order-${Date.now()}`));
      const nextEscrowId = (escrowCount as bigint | undefined ? (escrowCount as bigint) + 1n : undefined);
      const openId = nextEscrowId ?? 1n;
      
      // Step 1: Check/request vault token approval required by CommerceEscrow
      const { buyerVault, spender } = await getRequiredApproval(address as `0x${string}`);
      if (buyerVault === '0x0000000000000000000000000000000000000000') {
        throw new Error('No vault found for this wallet. Create a vault before using escrow checkout.');
      }

      const allowance = await checkAllowance(buyerVault, spender);
      if (allowance < amountWei) {
        await approveToken(buyerVault, spender, amountWei);
      }

      // Step 2: Open escrow order
      const openHash = await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'open',
        args: [merchant, amountWei, metaHash],
      });

      if (!publicClient) {
        throw new Error('Wallet client not available');
      }
      await publicClient.waitForTransactionReceipt({ hash: openHash });

      // Step 3: Mark escrow funded (pulls from buyer vault to escrow contract)
      await writeContractAsync({
        address: escrowAddress,
        abi: CommerceEscrowABI,
        functionName: 'markFunded',
        args: [openId],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, approveToken, checkAllowance, escrowAddress, escrowCount, getRequiredApproval, hasEscrowConfig, publicClient, writeContractAsync]);

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
      void id;
      throw new Error('Timeout claim is not supported by CommerceEscrow. Use release, refund, or dispute resolution.');
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
        functionName: 'dispute',
        args: [id, 'user_dispute'],
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
        functionName: 'resolve',
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
      void id;
      void buyerShareBps;
      throw new Error('Partial dispute resolution is not supported by CommerceEscrow.');
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
      void id;
      throw new Error('Timeout notifications are not supported by CommerceEscrow.');
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

  const activeEscrows = useMemo(() => escrows.filter(e => e.state === 1 || e.state === 2), [escrows]);
  const completedEscrows = useMemo(() => escrows.filter(e => e.state === 3 || e.state === 4 || e.state === 6), [escrows]);
  const disputedEscrows = useMemo(() => escrows.filter(e => e.state === 5), [escrows]);

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
