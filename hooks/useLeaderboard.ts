/**
 * useLeaderboard - Fetch real leaderboard data from Seer contract
 * 
 * Since there's no built-in "getTopScorers" function in the contract,
 * we use events to track score changes and build a leaderboard.
 * For production, this should be replaced with a subgraph/indexer.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, SEER_ABI } from '@/lib/contracts';
import { getScoreTier as _getScoreTier } from './useProofScore';
import { parseAbiItem } from 'viem';

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  address: `0x${string}`;
  score: number;
  tier: string;
  change: number;
  badges: number;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  userRank: number | null;
  totalParticipants: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_KEY = 'vfide_leaderboard_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Known active addresses on testnet (seed addresses for initial data)
// These will be augmented by event scanning
const SEED_ADDRESSES: `0x${string}`[] = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f8bEb1',
  '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTierFromScore(score: number): string {
  if (score >= 9000) return 'CHAMPION';
  if (score >= 7500) return 'GUARDIAN';
  if (score >= 6000) return 'DELEGATE';
  if (score >= 4500) return 'ADVOCATE';
  if (score >= 3000) return 'MERCHANT';
  return 'NEUTRAL';
}

function getCachedLeaderboard(): LeaderboardEntry[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { entries, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return entries;
  } catch {
    return null;
  }
}

function setCachedLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      entries,
      timestamp: Date.now(),
    }));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useLeaderboard(limit: number = 50): LeaderboardState & {
  refetch: () => Promise<void>;
} {
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  
  const [state, setState] = useState<LeaderboardState>({
    entries: [],
    isLoading: true,
    error: null,
    userRank: null,
    totalParticipants: 0,
  });

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient) {
      setState(prev => ({ ...prev, isLoading: false, error: new Error('No client') }));
      return;
    }

    // Check cache first
    const cached = getCachedLeaderboard();
    if (cached && cached.length > 0) {
      const userRank = userAddress 
        ? cached.findIndex(e => e.address.toLowerCase() === userAddress.toLowerCase()) + 1 || null
        : null;
      setState({
        entries: cached.slice(0, limit),
        isLoading: false,
        error: null,
        userRank,
        totalParticipants: cached.length,
      });
      // Continue to fetch fresh data in background
    }

    try {
      setState(prev => ({ ...prev, isLoading: !cached }));

      // Collect unique addresses from events
      const addresses = new Set<`0x${string}`>(SEED_ADDRESSES);
      
      // Try to get addresses from ProofScore events if available
      try {
        const scoreEvents = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.Seer,
          event: parseAbiItem('event ScoreUpdated(address indexed subject, uint16 newScore, string reason)'),
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        
        scoreEvents.forEach(event => {
          if (event.args.subject) {
            addresses.add(event.args.subject as `0x${string}`);
          }
        });
      } catch {
        // Events may not be available, continue with seed addresses
      }

      // Also try reward events
      try {
        const rewardEvents = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.Seer,
          event: parseAbiItem('event UserRewarded(address indexed user, uint16 delta, string reason)'),
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        
        rewardEvents.forEach(event => {
          if (event.args.user) {
            addresses.add(event.args.user as `0x${string}`);
          }
        });
      } catch {
        // Continue
      }

      // Fetch scores for all addresses
      const entries: LeaderboardEntry[] = [];
      const addressArray = Array.from(addresses);
      
      // Batch fetch scores
      const scorePromises = addressArray.map(async (addr) => {
        try {
          const score = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.Seer,
            abi: SEER_ABI,
            functionName: 'getScore',
            args: [addr],
          });
          
          return {
            address: addr,
            score: Number(score),
          };
        } catch {
          return null;
        }
      });

      const scores = await Promise.all(scorePromises);
      const validScores = scores.filter((s): s is { address: `0x${string}`; score: number } => 
        s !== null && s.score > 0
      );

      // Sort by score descending
      validScores.sort((a, b) => b.score - a.score);

      // Build leaderboard entries
      validScores.forEach((item, index) => {
        entries.push({
          rank: index + 1,
          address: item.address,
          score: item.score,
          tier: getTierFromScore(item.score),
          change: 0, // Would need historical data to calculate
          badges: Math.floor(item.score / 1000), // Estimate based on score
        });
      });

      // Cache the results
      if (entries.length > 0) {
        setCachedLeaderboard(entries);
      }

      // Calculate user rank
      const userRank = userAddress
        ? entries.findIndex(e => e.address.toLowerCase() === userAddress.toLowerCase()) + 1 || null
        : null;

      setState({
        entries: entries.slice(0, limit),
        isLoading: false,
        error: null,
        userRank: userRank || null,
        totalParticipants: entries.length,
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch leaderboard'),
      }));
    }
  }, [publicClient, userAddress, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    ...state,
    refetch: fetchLeaderboard,
  };
}

// ============================================================================
// USER RANK HOOK
// ============================================================================

export function useUserRank() {
  const { address } = useAccount();
  const { entries, userRank, totalParticipants, isLoading } = useLeaderboard(100);
  
  const { data: score } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'getScore',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const userScore = score ? Number(score) : 0;
  const userTier = getTierFromScore(userScore);

  return {
    rank: userRank,
    score: userScore,
    tier: userTier,
    totalParticipants,
    percentile: userRank && totalParticipants 
      ? Math.round((1 - userRank / totalParticipants) * 100) 
      : null,
    isLoading,
    topNearby: entries.slice(
      Math.max(0, (userRank || 1) - 3),
      (userRank || 1) + 2
    ),
  };
}
