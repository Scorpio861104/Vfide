/**
 * HEADHUNTER COMPETITION HOOKS
 * 
 * React hooks for interacting with EcosystemVault referral/work-reward functions
 */

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { EcosystemVaultABI } from '@/lib/abis';

// Contract address (update with deployed address)
const ECOSYSTEM_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

export interface HeadhunterStats {
  currentYearPoints: number;
  estimatedRank: number;
  currentYearNumber: bigint;
  currentQuarterNumber: bigint;
  quarterEndsAt: bigint;
  isLoading: boolean;
  error: Error | null;
}

export interface HeadhunterReward {
  referrerPoints: number;
  claimed: boolean;
  quarterEnded: boolean;
  poolSnapshot: bigint;
  estimatedReward: bigint;
  rewardShare: string;
  isLoading: boolean;
  error: Error | null;
}

export interface PendingReferral {
  merchantReferrer: `0x${string}`;
  userReferrer: `0x${string}`;
  credited: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get headhunter stats for current user
 */
export function useHeadhunterStats(): HeadhunterStats {
  const { address } = useAccount();
  
  const { data, isLoading, error } = useReadContract({
    address: ECOSYSTEM_VAULT_ADDRESS,
    abi: EcosystemVaultABI,
    functionName: 'getHeadhunterStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  if (!data || !address) {
    return {
      currentYearPoints: 0,
      estimatedRank: 0,
      currentYearNumber: 0n,
      currentQuarterNumber: 0n,
      quarterEndsAt: 0n,
      isLoading,
      error: error as Error | null,
    };
  }

  // Type assertion for JSON ABI return value
  const dataTuple = data as readonly [bigint, bigint, bigint, bigint, bigint];
  const [currentYearPoints, estimatedRank, currentYearNumber, currentQuarterNumber, quarterEndsAt] = dataTuple;

  return {
    currentYearPoints: Number(currentYearPoints),
    estimatedRank: Number(estimatedRank),
    currentYearNumber,
    currentQuarterNumber,
    quarterEndsAt,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Preview headhunter reward for a specific quarter
 */
export function useHeadhunterReward(year: bigint, quarter: bigint): HeadhunterReward {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: ECOSYSTEM_VAULT_ADDRESS,
    abi: EcosystemVaultABI,
    functionName: 'previewHeadhunterReward',
    args: address && year && quarter ? [year, quarter, address] : undefined,
    query: {
      enabled: !!address && !!year && !!quarter,
    },
  });

  if (!data || !address) {
    return {
      referrerPoints: 0,
      claimed: false,
      quarterEnded: false,
      poolSnapshot: 0n,
      estimatedReward: 0n,
      rewardShare: '0%',
      isLoading,
      error: error as Error | null,
    };
  }

  // Type assertion for JSON ABI return value
  const rewardDataTuple = data as readonly [bigint, boolean, boolean, bigint];
  const [referrerPoints, claimed, quarterEndedFlag, poolSnapshot] = rewardDataTuple;

  return {
    referrerPoints: Number(referrerPoints),
    claimed,
    quarterEnded: quarterEndedFlag,
    poolSnapshot,
    estimatedReward: 0n,
    rewardShare: 'Fixed work rewards only',
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Get pending referral info for an address
 */
export function usePendingReferral(referred: `0x${string}` | undefined): PendingReferral {
  const { data, isLoading, error } = useReadContract({
    address: ECOSYSTEM_VAULT_ADDRESS,
    abi: EcosystemVaultABI,
    functionName: 'getPendingReferral',
    args: referred ? [referred] : undefined,
    query: {
      enabled: !!referred,
    },
  });

  if (!data || !referred) {
    return {
      merchantReferrer: '0x0000000000000000000000000000000000000000',
      userReferrer: '0x0000000000000000000000000000000000000000',
      credited: false,
      isLoading,
      error: error as Error | null,
    };
  }

  // Type assertion for JSON ABI return value
  const referralDataTuple = data as readonly [`0x${string}`, `0x${string}`, boolean];
  const [merchantReferrer, userReferrer, credited] = referralDataTuple;

  return {
    merchantReferrer,
    userReferrer,
    credited,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Claim headhunter reward for a completed quarter
 */
export function useClaimHeadhunterReward() {
  const { isPending, isSuccess, error } = useWriteContract();
  const [txHash] = useState<`0x${string}` | null>(null);

  const claimReward = async (_year: bigint, _quarter: bigint) => {
    throw new Error('Rank/percentage headhunter claims are disabled. Use fixed work reward payouts via manager hooks.');
  };

  return {
    claimReward,
    isPending,
    isSuccess,
    txHash,
    error: error as Error | null,
  };
}

/**
 * Manager hook: pay fixed referral work reward from referral pool.
 */
export function usePayReferralWorkReward() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const payReferralWorkReward = async (
    worker: `0x${string}`,
    amount: string,
    reason: string
  ) => {
    writeContract({
      address: ECOSYSTEM_VAULT_ADDRESS,
      abi: EcosystemVaultABI,
      functionName: 'payReferralWorkReward',
      args: [worker, parseEther(amount), reason],
    });
  };

  return {
    payReferralWorkReward,
    isPending,
    isSuccess,
    error: error as Error | null,
  };
}

/**
 * Manager hook: pay fixed merchant work reward from merchant pool.
 */
export function usePayMerchantWorkReward() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const payMerchantWorkReward = async (
    worker: `0x${string}`,
    amount: string,
    reason: string
  ) => {
    writeContract({
      address: ECOSYSTEM_VAULT_ADDRESS,
      abi: EcosystemVaultABI,
      functionName: 'payMerchantWorkReward',
      args: [worker, parseEther(amount), reason],
    });
  };

  return {
    payMerchantWorkReward,
    isPending,
    isSuccess,
    error: error as Error | null,
  };
}

/**
 * Hook to get referral link for current user
 */
export function useReferralLink() {
  const { address } = useAccount();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.com';
  
  return {
    referralLink: address ? `${baseUrl}/signup?ref=${address}` : '',
    qrCodeUrl: address ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/signup?ref=${address}`)}` : '',
  };
}

/**
 * Calculate estimated quarterly pool size
 */
export function useQuarterlyPoolEstimate() {
  const [poolEstimate, setPoolEstimate] = useState<bigint>(0n);
  
  useEffect(() => {
    // In production, this would come from contract
    // Estimated 25% of ecosystem fees allocated to headhunters
    // Assuming $50k monthly volume = $12.5k quarterly
    setPoolEstimate(parseEther('12500')); // 12,500 VFIDE
  }, []);

  return {
    poolEstimate,
    formattedPool: `$${formatEther(poolEstimate)}`,
  };
}

/**
 * Get referral activity history
 * 
 * NOTE: This hook returns demo data for UI preview purposes.
 * In production with a deployed subgraph, this would fetch real
 * on-chain referral events. The subgraph would index:
 * - UserReferred events from EcosystemVault
 * - MerchantReferred events from EcosystemVault
 * 
 * For now, mock data provides a realistic UI experience for testing.
 */
export interface ReferralActivity {
  id: string;
  type: 'user' | 'merchant';
  address: `0x${string}`;
  status: 'pending' | 'credited';
  timestamp: number;
  points: number;
  txHash: `0x${string}`;
}

export function useReferralActivity() {
  const { address } = useAccount();
  const [activity, setActivity] = useState<ReferralActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setActivity([]);
      setIsLoading(false);
      return;
    }

    // In production, fetch from subgraph or event logs
    // For now, return mock data
    setActivity([
      {
        id: '1',
        type: 'merchant',
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as `0x${string}`,
        status: 'credited',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        points: 3,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      },
      {
        id: '2',
        type: 'user',
        address: '0x1234567890ABCDEF1234567890ABCDEF12345678' as `0x${string}`,
        status: 'pending',
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
        points: 1,
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
      },
    ]);
    setIsLoading(false);
  }, [address]);

  return {
    activity,
    isLoading,
  };
}

/**
 * Get top 20 leaderboard
 * 
 * NOTE: This hook returns demo data for UI preview purposes.
 * In production with a deployed subgraph, this would query aggregated
 * referral points per address, sorted by total points descending.
 * The subgraph would maintain running totals per year/quarter.
 * 
 * For now, mock data provides a realistic UI experience for testing.
 */
export interface LeaderboardEntry {
  rank: number;
  address: `0x${string}`;
  points: number;
  userReferrals: number;
  merchantReferrals: number;
  estimatedReward: string;
  isCurrentUser: boolean;
}

export function useLeaderboard(year: bigint, quarter: bigint) {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!year || !quarter) {
      setLeaderboard([]);
      setIsLoading(false);
      return;
    }

    // In production, fetch from subgraph or contract
    // For now, return mock data
    const mockData: LeaderboardEntry[] = [
      { rank: 1, address: '0x1234567890ABCDEF1234567890ABCDEF12345678' as `0x${string}`, points: 45, userReferrals: 30, merchantReferrals: 5, estimatedReward: 'Manager-assigned fixed work payout', isCurrentUser: false },
      { rank: 2, address: '0x2345678901BCDEF23456789012CDEF3456789012' as `0x${string}`, points: 38, userReferrals: 26, merchantReferrals: 4, estimatedReward: 'Manager-assigned fixed work payout', isCurrentUser: false },
      { rank: 3, address: '0x3456789012CDEF34567890123DEF45678901234' as `0x${string}`, points: 32, userReferrals: 23, merchantReferrals: 3, estimatedReward: 'Manager-assigned fixed work payout', isCurrentUser: false },
      { rank: 7, address: address || ('0x0000000000000000000000000000000000000000' as `0x${string}`), points: 18, userReferrals: 4, merchantReferrals: 2, estimatedReward: 'Manager-assigned fixed work payout', isCurrentUser: true },
    ];

    setLeaderboard(mockData);
    setIsLoading(false);
  }, [year, quarter, address]);

  return {
    leaderboard,
    isLoading,
  };
}
