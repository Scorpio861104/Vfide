/**
 * HEADHUNTER COMPETITION HOOKS
 * 
 * React hooks for interacting with EcosystemVault headhunter functions
 */

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';

// EcosystemVault ABI (partial - only headhunter functions)
const ECOSYSTEM_VAULT_ABI = [
  {
    name: 'getHeadhunterStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'referrer', type: 'address' }],
    outputs: [
      { name: 'currentYearPoints', type: 'uint16' },
      { name: 'estimatedRank', type: 'uint8' },
      { name: 'currentYearNumber', type: 'uint256' },
      { name: 'currentQuarterNumber', type: 'uint256' },
      { name: 'quarterEndsAt', type: 'uint256' }
    ]
  },
  {
    name: 'previewHeadhunterReward',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'year', type: 'uint256' },
      { name: 'quarter', type: 'uint256' },
      { name: 'referrer', type: 'address' }
    ],
    outputs: [
      { name: 'referrerPoints', type: 'uint16' },
      { name: 'claimed', type: 'bool' },
      { name: 'quarterEndedFlag', type: 'bool' },
      { name: 'poolSnapshot', type: 'uint256' }
    ]
  },
  {
    name: 'claimHeadhunterReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'year', type: 'uint256' },
      { name: 'quarter', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'getPendingReferral',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'referred', type: 'address' }],
    outputs: [
      { name: 'merchantReferrer', type: 'address' },
      { name: 'userReferrer', type: 'address' },
      { name: 'credited', type: 'bool' }
    ]
  }
] as const;

// Contract address (update with deployed address)
const ECOSYSTEM_VAULT_ADDRESS = process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS as `0x${string}` || '0x0';

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
    abi: ECOSYSTEM_VAULT_ABI,
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

  const [currentYearPoints, estimatedRank, currentYearNumber, currentQuarterNumber, quarterEndsAt] = data;

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
    abi: ECOSYSTEM_VAULT_ABI,
    functionName: 'previewHeadhunterReward',
    args: address && year && quarter ? [year, quarter, address] : undefined,
    query: {
      enabled: !!address && !!year && !!quarter,
    },
  });

  // Rank reward percentages (BPS - basis points out of 10000)
  const RANK_SHARES = [
    1500, 1200, 1000, 800, 700, 600, 500, 450, 400, 350,
    300, 280, 260, 240, 220, 200, 180, 160, 140, 120
  ];

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

  const [referrerPoints, claimed, quarterEndedFlag, poolSnapshot] = data;
  const rank = Number(referrerPoints) > 0 ? calculateRank(Number(referrerPoints)) : 0;
  
  // Calculate estimated reward
  let estimatedReward = 0n;
  let rewardShare = '0%';
  
  if (rank > 0 && rank <= 20 && quarterEndedFlag) {
    const shareBPS = BigInt(RANK_SHARES[rank - 1] ?? 0);
    estimatedReward = (poolSnapshot * shareBPS) / 10000n;
    rewardShare = `${(Number(shareBPS) / 100).toFixed(1)}%`;
  }

  return {
    referrerPoints: Number(referrerPoints),
    claimed,
    quarterEnded: quarterEndedFlag,
    poolSnapshot,
    estimatedReward,
    rewardShare,
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
    abi: ECOSYSTEM_VAULT_ABI,
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

  const [merchantReferrer, userReferrer, credited] = data;

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
  const { writeContract, isPending, isSuccess, error } = useWriteContract();
  const [txHash] = useState<`0x${string}` | null>(null);

  const claimReward = async (year: bigint, quarter: bigint) => {
    try {
      writeContract({
        address: ECOSYSTEM_VAULT_ADDRESS,
        abi: ECOSYSTEM_VAULT_ABI,
        functionName: 'claimHeadhunterReward',
        args: [year, quarter],
      });
    } catch (err) {
      console.error('Claim failed:', err);
      throw err;
    }
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
 * Helper function to calculate rank based on points
 * (This would need to be replaced with actual on-chain data)
 */
function calculateRank(points: number): number {
  // Mock implementation - replace with actual leaderboard data
  // In reality, you'd fetch all referrers and sort by points
  if (points >= 45) return 1;
  if (points >= 38) return 2;
  if (points >= 32) return 3;
  if (points >= 25) return 4;
  if (points >= 20) return 5;
  if (points >= 18) return 7;
  if (points >= 15) return 10;
  if (points >= 10) return 15;
  if (points >= 5) return 20;
  return 21; // Not in top 20
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
 * (Would need to be tracked via events or subgraph)
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
 * (Would need to be tracked via subgraph)
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
      { rank: 1, address: '0x1234567890ABCDEF1234567890ABCDEF12345678' as `0x${string}`, points: 45, userReferrals: 30, merchantReferrals: 5, estimatedReward: '$3,750', isCurrentUser: false },
      { rank: 2, address: '0x2345678901BCDEF23456789012CDEF3456789012' as `0x${string}`, points: 38, userReferrals: 26, merchantReferrals: 4, estimatedReward: '$3,000', isCurrentUser: false },
      { rank: 3, address: '0x3456789012CDEF34567890123DEF45678901234' as `0x${string}`, points: 32, userReferrals: 23, merchantReferrals: 3, estimatedReward: '$2,500', isCurrentUser: false },
      { rank: 7, address: address || ('0x0000000000000000000000000000000000000000' as `0x${string}`), points: 18, userReferrals: 4, merchantReferrals: 2, estimatedReward: '$1,250', isCurrentUser: true },
    ];

    setLeaderboard(mockData);
    setIsLoading(false);
  }, [year, quarter, address]);

  return {
    leaderboard,
    isLoading,
  };
}
