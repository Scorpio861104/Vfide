/**
 * usePayroll - Production-grade payroll streaming hook
 * 
 * Provides a clean interface for all payroll operations with:
 * - Real-time stream synchronization
 * - Automatic claimable amount updates
 * - Type-safe contract interactions
 */

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { PayrollManagerABI } from '@/lib/abis';

// Contract addresses from environment
const PAYROLL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5') as `0x${string}`;

// Check if contract is deployed
const IS_DEPLOYED = PAYROLL_MANAGER_ADDRESS !== '0x0000000000000000000000000000000000000000';

export interface PayrollStream {
  id: bigint;
  payer: `0x${string}`;
  payee: `0x${string}`;
  token: `0x${string}`;
  ratePerSecond: bigint;
  startTime: bigint;
  lastWithdrawTime: bigint;
  depositBalance: bigint;
  active: boolean;
  paused: boolean;
  pausedAt: bigint;
  pausedAccrued: bigint;
  // Computed fields
  claimable: bigint;
  monthlyRate: bigint;
}

export function usePayroll() {
  const { address } = useAccount();
  const [streams, setStreams] = useState<PayrollStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Contract write hooks
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read payer streams
  const { data: payerStreamIds, refetch: refetchPayerStreams } = useReadContract({
    address: PAYROLL_MANAGER_ADDRESS,
    abi: PayrollManagerABI,
    functionName: 'getPayerStreams',
    args: address ? [address] : undefined,
    query: {
      enabled: IS_DEPLOYED && !!address,
    }
  });

  // Read payee streams
  const { data: payeeStreamIds, refetch: refetchPayeeStreams } = useReadContract({
    address: PAYROLL_MANAGER_ADDRESS,
    abi: PayrollManagerABI,
    functionName: 'getPayeeStreams',
    args: address ? [address] : undefined,
    query: {
      enabled: IS_DEPLOYED && !!address,
    }
  });

  // Update time more efficiently - only when there are active streams
  // Using a longer interval (5 seconds) to reduce unnecessary re-renders
  useEffect(() => {
    // Only run interval if there are active receiving streams
    if (streams.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000); // Update every 5 seconds instead of every second
    
    return () => clearInterval(interval);
  }, [streams.length]);

  // Calculate claimable amount for a stream
  const calculateClaimable = useCallback((stream: PayrollStream): bigint => {
    if (!stream.active) return BigInt(0);
    
    const now = BigInt(Math.floor(currentTime / 1000));
    
    if (stream.paused) {
      return stream.pausedAccrued;
    }
    
    const elapsed = now - stream.lastWithdrawTime;
    const streamed = elapsed * stream.ratePerSecond;
    
    // Cap at deposit balance
    return streamed > stream.depositBalance ? stream.depositBalance : streamed;
  }, [currentTime]);

  const streamIds = useMemo(() => {
    const allIds = new Set<bigint>();
    const payerIds = payerStreamIds as readonly bigint[] | undefined;
    const payeeIds = payeeStreamIds as readonly bigint[] | undefined;

    if (payerIds) payerIds.forEach((id) => allIds.add(id));
    if (payeeIds) payeeIds.forEach((id) => allIds.add(id));

    return Array.from(allIds);
  }, [payerStreamIds, payeeStreamIds]);

  const { data: streamReads, isLoading: streamsLoading, error: streamsError } = useReadContracts({
    contracts: streamIds.map((id) => ({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'getStream',
      args: [id],
    })),
    query: { enabled: IS_DEPLOYED && !!address && streamIds.length > 0 },
  });

  useEffect(() => {
    if (!IS_DEPLOYED || !address) {
      setStreams([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (streamsError) {
      setStreams([]);
      setLoading(false);
      setError(streamsError instanceof Error ? streamsError.message : 'Failed to load streams');
      return;
    }

    if (streamsLoading) {
      setLoading(true);
      return;
    }

    if (!streamReads || streamIds.length === 0) {
      setStreams([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(false);
    setError(null);

    const loadedStreams: PayrollStream[] = streamReads
      .map((read, index) => {
        if (!read || read.status === 'failure' || !read.result) return null;
        const stream = read.result as {
          payer: `0x${string}`;
          payee: `0x${string}`;
          token: `0x${string}`;
          ratePerSecond: bigint;
          startTime: bigint;
          lastWithdrawTime: bigint;
          depositBalance: bigint;
          active: boolean;
          paused: boolean;
          pausedAt: bigint;
          pausedAccrued: bigint;
        };

        const claimable = calculateClaimable({
          id: streamIds[index],
          ...stream,
          claimable: BigInt(0),
          monthlyRate: BigInt(0),
        } as PayrollStream);

        const monthlyRate = stream.ratePerSecond * BigInt(30 * 24 * 60 * 60);

        return {
          id: streamIds[index],
          ...stream,
          claimable,
          monthlyRate,
        } as PayrollStream;
      })
      .filter((stream): stream is PayrollStream => stream !== null);

    setStreams(loadedStreams);
  }, [address, streamIds, streamReads, streamsLoading, streamsError, calculateClaimable]);

  // Create a new stream
  const createStream = useCallback(async (
    payee: string,
    monthlyRate: string,
    initialDeposit: string
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (!isAddress(payee)) throw new Error('Invalid payee address');
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed on this network');

    // Convert monthly rate to per-second rate
    const monthlyWei = parseUnits(monthlyRate, 18);
    const ratePerSecond = monthlyWei / BigInt(30 * 24 * 60 * 60);
    const deposit = parseUnits(initialDeposit, 18);

    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'createStream',
      args: [payee as `0x${string}`, VFIDE_TOKEN_ADDRESS, ratePerSecond, deposit],
    });
  }, [address, writeContract]);

  // Withdraw claimable funds
  const withdraw = useCallback(async (streamId: bigint) => {
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed');

    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'withdraw',
      args: [streamId],
    });
  }, [writeContract]);

  // Pause a stream
  const pauseStream = useCallback(async (streamId: bigint) => {
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed');

    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'pauseStream',
      args: [streamId],
    });
  }, [writeContract]);

  // Resume a stream
  const resumeStream = useCallback(async (streamId: bigint) => {
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed');

    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'resumeStream',
      args: [streamId],
    });
  }, [writeContract]);

  // Cancel a stream
  const cancelStream = useCallback(async (streamId: bigint) => {
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed');

    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'cancelStream',
      args: [streamId],
    });
  }, [writeContract]);

  // Top up a stream
  const topUp = useCallback(async (streamId: bigint, amount: string) => {
    if (!IS_DEPLOYED) throw new Error('PayrollManager not deployed');

    const amountWei = parseUnits(amount, 18);
    
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PayrollManagerABI,
      functionName: 'topUp',
      args: [streamId, amountWei],
    });
  }, [writeContract]);

  // Refresh data
  const refresh = useCallback(() => {
    refetchPayerStreams();
    refetchPayeeStreams();
  }, [refetchPayerStreams, refetchPayeeStreams]);

  // Auto-reload after successful transaction
  useEffect(() => {
    if (isSuccess) {
      refresh();
    }
  }, [isSuccess, refresh]);

  // Error handling
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
    }
  }, [writeError]);

  // Computed stream filters
  const receivingStreams = useMemo(() => 
    streams.filter(s => s.payee === address && s.active), 
    [streams, address]
  );
  
  const sendingStreams = useMemo(() => 
    streams.filter(s => s.payer === address && s.active), 
    [streams, address]
  );

  // Format helpers
  const formatAmount = useCallback((amount: bigint): string => {
    return formatUnits(amount, 18);
  }, []);

  const formatMonthlyRate = useCallback((ratePerSecond: bigint): string => {
    const monthly = ratePerSecond * BigInt(30 * 24 * 60 * 60);
    return formatUnits(monthly, 18);
  }, []);

  const formatTimeRemaining = useCallback((depositBalance: bigint, ratePerSecond: bigint): string => {
    if (ratePerSecond === BigInt(0)) return 'N/A';
    
    const seconds = Number(depositBalance / ratePerSecond);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Less than 1h';
  }, []);

  // Total stats
  const totalReceiving = useMemo(() => 
    receivingStreams.reduce((sum, s) => sum + s.ratePerSecond * BigInt(30 * 24 * 60 * 60), BigInt(0)),
    [receivingStreams]
  );

  const totalSending = useMemo(() => 
    sendingStreams.reduce((sum, s) => sum + s.ratePerSecond * BigInt(30 * 24 * 60 * 60), BigInt(0)),
    [sendingStreams]
  );

  const totalClaimable = useMemo(() => 
    receivingStreams.reduce((sum, s) => sum + calculateClaimable(s), BigInt(0)),
    [receivingStreams, calculateClaimable]
  );

  return {
    // Data
    streams,
    receivingStreams,
    sendingStreams,
    loading: loading || isPending || isConfirming,
    error,
    isSuccess,
    isDeployed: IS_DEPLOYED,
    currentTime,
    
    // Stats
    totalReceiving,
    totalSending,
    totalClaimable,
    
    // Actions
    createStream,
    withdraw,
    pauseStream,
    resumeStream,
    cancelStream,
    topUp,
    refresh,
    
    // Helpers
    formatAmount,
    formatMonthlyRate,
    formatTimeRemaining,
    calculateClaimable,
  };
}
