/**
 * useLeaderboard - Fetch real leaderboard data from Seer contract
 *
 * Since there's no built-in "getTopScorers" function in the contract,
 * we scan `ScoreSet` events to collect addresses that have ever had a
 * score change, then read each one's current score. For production,
 * this should be replaced with a subgraph or indexer; today this
 * means the leaderboard is bounded by event-log query limits.
 *
 * Pre-cleanup, this hook seeded its address set with three hardcoded
 * Ethereum addresses labeled "Known active addresses on testnet". They
 * weren't actually known active addresses on our testnet — they're
 * arbitrary mainnet addresses, and they were filtered out anyway by
 * `score > 0` since they have no on-chain score in this contract. Also
 * dropped: a fake `badges: Math.floor(score / 1000)` field that was in
 * the type but never rendered. Real badge counts need a BadgeNFT read.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount, useReadContract } from 'wagmi';
import { SeerABI, getContractConfigurationError, isConfiguredContractAddress } from '@/lib/contracts'
import { useContractAddresses } from './useContractAddresses';
import { getScoreTier as _getScoreTier } from './useProofScore';
import { parseAbiItem } from 'viem';
import { safeGetJSON, safeSetJSON, safeRemoveItem } from '@/lib/storage';

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  address: `0x${string}`;
  score: number;
  tier: string;
  change: number;
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTierFromScore(score: number): string {
  if (score >= 8000) return 'ELITE';
  if (score >= 7000) return 'COUNCIL';
  if (score >= 5600) return 'TRUSTED';
  if (score >= 5400) return 'GOVERNANCE';
  if (score >= 5000) return 'NEUTRAL';
  if (score >= 4000) return 'LOW TRUST';
  return 'RISKY';
}

function getCachedLeaderboard(): LeaderboardEntry[] | null {
  if (typeof window === 'undefined') return null;
  
  const cached = safeGetJSON<{ entries: LeaderboardEntry[]; timestamp: number }>(CACHE_KEY, { entries: [], timestamp: 0 });
  if (!cached.entries || !cached.timestamp) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    safeRemoveItem(CACHE_KEY);
    return null;
  }
  
  return cached.entries;
}

function setCachedLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  
  safeSetJSON(CACHE_KEY, {
    entries,
    timestamp: Date.now(),
  });
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useLeaderboard(limit: number = 50): LeaderboardState & { refetch: () => Promise<void> } {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  
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

    if (!isAvailable) {
      setState(prev => ({
        ...prev,
        entries: [],
        isLoading: false,
        error: getContractConfigurationError('Seer'),
        userRank: null,
        totalParticipants: 0,
      }));
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

      // Collect unique addresses from ScoreSet events
      const addresses = new Set<`0x${string}`>();
      
      // Try to get addresses from ProofScore events if available
      try {
        const scoreEvents = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.Seer,
          event: parseAbiItem('event ScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason)'),
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        
        scoreEvents.forEach(event => {
          if (event.args.subject) {
            addresses.add(event.args.subject as `0x${string}`);
          }
        });
      } catch {
        // Events query failed (RPC limit, log lookback, etc). The address
        // set may be empty in this case; the leaderboard will render empty.
      }

      // Fetch scores for all addresses
      const entries: LeaderboardEntry[] = [];
      const addressArray = Array.from(addresses);
      
      // Batch fetch scores
      const scorePromises = addressArray.map(async (addr) => {
        try {
          const score = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.Seer,
            abi: SeerABI,
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
          change: 0, // Requires historical data to populate; left at 0
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
  }, [publicClient, userAddress, limit, isAvailable]);

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
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address } = useAccount();
  const { entries, userRank, totalParticipants, isLoading } = useLeaderboard(100);
  
  const { data: score } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
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
