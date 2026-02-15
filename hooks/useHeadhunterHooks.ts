/**
 * HEADHUNTER COMPETITION HOOKS
 * 
 * React hooks for interacting with EcosystemVault headhunter functions
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

  // Type assertion for JSON ABI return value
  const rewardDataTuple = data as readonly [bigint, boolean, boolean, bigint];
  const [referrerPoints, claimed, quarterEndedFlag, poolSnapshot] = rewardDataTuple;
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
  const { writeContract, isPending, isSuccess, error } = useWriteContract();
  const [txHash] = useState<`0x${string}` | null>(null);

  const claimReward = async (year: bigint, quarter: bigint) => {
    try {
      writeContract({
        address: ECOSYSTEM_VAULT_ADDRESS,
        abi: EcosystemVaultABI,
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
 * (Fallback when leaderboard API data is unavailable)
 */
function calculateRank(points: number): number {
  // Fallback heuristic only. Prefer API leaderboard data when available.
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
    qrCodeUrl: '', // QR code should be generated locally using qrcode.react, not via third-party API
  };
}

/**
 * Calculate estimated quarterly pool size
 */
export function useQuarterlyPoolEstimate() {
  const [poolEstimate, setPoolEstimate] = useState<bigint>(0n);
  
  useEffect(() => {
    let isMounted = true;

    const fetchPool = async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const quarter = Math.floor(now.getUTCMonth() / 3) + 1;

      try {
        const response = await fetch(`/api/leaderboard/headhunter?year=${year}&quarter=${quarter}`);
        if (!response.ok) throw new Error('Failed to fetch pool estimate');
        const data = await response.json();
        const rewardPool = data?.meta?.rewardPool ?? 0;
        const estimate = parseEther(String(rewardPool || 0));
        if (isMounted) setPoolEstimate(estimate);
      } catch {
        if (isMounted) {
          setPoolEstimate(parseEther('0'));
        }
      }
    };

    fetchPool();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    poolEstimate,
    formattedPool: `$${formatEther(poolEstimate)}`,
  };
}

/**
 * Get referral activity history
 * 
 * NOTE: This hook reads referral activity from the API.
 * In production, back this with a subgraph indexing:
 * - UserReferred events from EcosystemVault
 * - MerchantReferred events from EcosystemVault
 * 
 * Update the API to pull from indexed chain events.
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

    let isMounted = true;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/activities?userAddress=${address}&limit=50&offset=0`);
        if (!response.ok) throw new Error('Failed to fetch referral activity');
        const data = await response.json();
        const items = Array.isArray(data.activities) ? data.activities : [];

        const mapped = items
          .filter((item: Record<string, unknown>) => {
            const type = String(item.activity_type ?? item.type ?? '').toLowerCase();
            return type.includes('referral');
          })
          .map((item: Record<string, unknown>): ReferralActivity => {
            const meta = typeof item.data === 'string'
              ? (() => {
                  try {
                    return JSON.parse(item.data);
                  } catch {
                    return {};
                  }
                })()
              : (item.data ?? {});
            const typeRaw = String(meta.type ?? item.activity_type ?? '').toLowerCase();
            return {
              id: String(item.id ?? `${item.activity_type}-${item.created_at}`),
              type: typeRaw.includes('merchant') ? 'merchant' : 'user',
              address: (meta.referrer ?? meta.address ?? item.user_address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
              status: (meta.status === 'credited' ? 'credited' : 'pending') as ReferralActivity['status'],
              timestamp: item.created_at ? new Date(item.created_at as string | number | Date).getTime() : Date.now(),
              points: Number(meta.points ?? 0),
              txHash: (meta.txHash ?? meta.transactionHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
            };
          });

        if (isMounted) {
          setActivity(mapped);
        }
      } catch {
        if (isMounted) {
          setActivity([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchActivity();
    return () => {
      isMounted = false;
    };
  }, [address]);

  return {
    activity,
    isLoading,
  };
}

/**
 * Get top 20 leaderboard
 * 
 * NOTE: This hook reads leaderboard data from the API.
 * In production, back this with a subgraph or contract reads.
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

    let isMounted = true;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/leaderboard/headhunter?year=${Number(year)}&quarter=${Number(quarter)}&userAddress=${address ?? ''}`
        );
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();
        const rows = Array.isArray(data.data) ? data.data : [];

        if (isMounted) {
          setLeaderboard(
            rows.map((entry: Record<string, unknown>) => ({
              rank: Number(entry.rank ?? 0),
              address: entry.address as `0x${string}`,
              points: Number(entry.points ?? 0),
              userReferrals: Number(entry.userReferrals ?? 0),
              merchantReferrals: Number(entry.merchantReferrals ?? 0),
              estimatedReward: String(entry.estimatedReward ?? '$0'),
              isCurrentUser: Boolean(entry.isCurrentUser),
            }))
          );
        }
      } catch {
        if (isMounted) {
          setLeaderboard([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [year, quarter, address]);

  return {
    leaderboard,
    isLoading,
  };
}
