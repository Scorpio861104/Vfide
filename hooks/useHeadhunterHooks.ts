/**
 * HEADHUNTER COMPETITION HOOKS
 * 
 * React hooks for interacting with EcosystemVault referral/work-reward functions
 */

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { EcosystemVaultABI, EcosystemVaultViewABI } from '@/lib/abis';

// Contract address (update with deployed address)
const ECOSYSTEM_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const ECOSYSTEM_VAULT_VIEW_ADDRESS = (process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS || process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

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

export interface ReferralLevelStatus {
  points: number;
  unlockedLevel: number;
  highestPaidLevel: number;
  nextLevel: number;
  nextLevelRequiredPoints: number;
  nextLevelReward: bigint;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get headhunter stats for current user
 */
export function useHeadhunterStats(): HeadhunterStats {
  const { address } = useAccount();
  
  const { data, isLoading, error } = useReadContract({
    address: ECOSYSTEM_VAULT_VIEW_ADDRESS,
    abi: EcosystemVaultViewABI,
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
    address: ECOSYSTEM_VAULT_VIEW_ADDRESS,
    abi: EcosystemVaultViewABI,
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
    address: ECOSYSTEM_VAULT_VIEW_ADDRESS,
    abi: EcosystemVaultViewABI,
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
 * Get referral level progress for a referrer and year.
 */
export function useReferralLevelStatus(year?: bigint): ReferralLevelStatus {
  const { address } = useAccount();
  const selectedYear = year ?? 1n;

  const { data, isLoading, error } = useReadContract({
    address: ECOSYSTEM_VAULT_VIEW_ADDRESS,
    abi: EcosystemVaultViewABI,
    functionName: 'getReferralLevelStatus',
    args: address ? [address, selectedYear] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  });

  if (!data || !address) {
    return {
      points: 0,
      unlockedLevel: 0,
      highestPaidLevel: 0,
      nextLevel: 0,
      nextLevelRequiredPoints: 0,
      nextLevelReward: 0n,
      isLoading,
      error: error as Error | null,
    };
  }

  const statusTuple = data as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
  const [points, unlockedLevel, highestPaidLevel, nextLevel, nextLevelRequiredPoints, nextLevelReward] = statusTuple;

  return {
    points: Number(points),
    unlockedLevel: Number(unlockedLevel),
    highestPaidLevel: Number(highestPaidLevel),
    nextLevel: Number(nextLevel),
    nextLevelRequiredPoints: Number(nextLevelRequiredPoints),
    nextLevelReward,
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
 * Manager hook: pay next unlocked referral level reward (milestone-based).
 */
export function usePayReferralLevelReward() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const payReferralLevelReward = async (
    worker: `0x${string}`,
    year: bigint,
    reason: string
  ) => {
    writeContract({
      address: ECOSYSTEM_VAULT_ADDRESS,
      abi: EcosystemVaultABI,
      functionName: 'payReferralLevelReward',
      args: [worker, year, reason],
    });
  };

  return {
    payReferralLevelReward,
    isPending,
    isSuccess,
    error: error as Error | null,
  };
}

/**
 * Self-claim hook: claim all currently unlocked referral level rewards for the connected wallet.
 */
export function useClaimReferralLevelRewards() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const claimReferralLevelRewards = async (year: bigint, reason: string) => {
    writeContract({
      address: ECOSYSTEM_VAULT_ADDRESS,
      abi: EcosystemVaultABI,
      functionName: 'claimReferralLevelRewards',
      args: [year, reason],
    });
  };

  return {
    claimReferralLevelRewards,
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
 * This hook should return indexed on-chain referral activity.
 * Until indexer support is wired, it returns an empty list.
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

    // Activity feed is indexer-backed; return empty state when index data is unavailable.
    setActivity([]);
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
 * This hook should return indexed leaderboard standings.
 * Until indexer support is wired, it returns an empty list.
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

    void address;
    // Data source integration point: fetch from subgraph or contract event indexer.
    setLeaderboard([]);
    setIsLoading(false);
  }, [year, quarter, address]);

  return {
    leaderboard,
    isLoading,
  };
}

/**
 * Manager/owner hook: deposit stablecoin into the EcosystemVault direct reserve.
 *
 * This is the recommended Howey-safe payment path for headhunter and top-merchant
 * work compensation.  Pre-fund this reserve with USDC/USDT so that all work rewards
 * are paid as fixed-dollar service fees with no DEX swap required:
 *
 *   1. Approve the EcosystemVault to spend your stablecoin:
 *        usdc.approve(ECOSYSTEM_VAULT_ADDRESS, amount)
 *   2. Call depositStablecoinReserve(usdcAddress, amount)
 *   3. Enable stablecoinOnlyMode via setStablecoinOnlyMode(true)
 *
 * Once funded and stablecoinOnlyMode is active, payMerchantWorkReward /
 * payReferralWorkReward / claimReferralLevelRewards all draw from this reserve.
 */
export function useDepositStablecoinReserve() {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();

  const depositStablecoinReserve = async (stablecoin: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: ECOSYSTEM_VAULT_ADDRESS,
      abi: EcosystemVaultABI,
      functionName: 'depositStablecoinReserve',
      args: [stablecoin, amount],
    });
  };

  return {
    depositStablecoinReserve,
    isPending,
    isSuccess,
    error,
  };
}

/**
 * Read the current stablecoin reserve balance for a given token.
 */
export function useStablecoinReserveBalance(stablecoin: `0x${string}` | undefined) {
  return useReadContract({
    address: ECOSYSTEM_VAULT_ADDRESS,
    abi: EcosystemVaultABI,
    functionName: 'stablecoinReserves',
    args: stablecoin ? [stablecoin] : undefined,
    query: { enabled: !!stablecoin },
  });
}
