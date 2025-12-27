import { useReadContract, useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES, SEER_ABI } from '@/lib/contracts'

/**
 * Hook to fetch user's ProofScore from the Seer contract
 * ProofScore is a reputation score (0-10000 scale) that affects transfer fees
 */
export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress

  const { data, isError, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })

  const scoreNum = data ? Number(data) : 5000 // Default neutral score (10x scale)
  
  // Calculate tier (matches vfide-hooks)
  const tier = getScoreTier(scoreNum)
  
  // Calculate burn fee based on ProofScore
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :
    scoreNum >= 7000 ? 1.0 :
    scoreNum >= 5000 ? 2.0 :
    scoreNum >= 4000 ? 3.5 :
    5.0
  
  // Color based on trust level
  const color = 
    scoreNum >= 8000 ? '#00FF88' : // Elite green
    scoreNum >= 7000 ? '#00F0FF' : // High trust cyan
    scoreNum >= 5000 ? '#FFD700' : // Neutral gold
    scoreNum >= 3500 ? '#FFA500' : '#FF4444' // Low/Risky orange/red

  return {
    score: scoreNum,
    tier,
    burnFee,
    color,
    canVote: scoreNum >= 5400,
    canMerchant: scoreNum >= 5600,
    canCouncil: scoreNum >= 7000,
    canEndorse: scoreNum >= 8000,
    isElite: scoreNum >= 8000,
    isError,
    isLoading,
    refetch,
  }
}

/**
 * Get tier name from ProofScore value
 */
export function getScoreTier(score: number): string {
  // Contract uses 0-10000 scale (10x precision)
  if (score >= 8000) return 'Elite'
  if (score >= 7000) return 'High Trust'
  if (score >= 5000) return 'Neutral'
  if (score >= 3500) return 'Low Trust'
  return 'Risky'
}

/**
 * Hook to read Seer thresholds from contract
 */
export function useSeerThresholds() {
  const { data: minForGovernance } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'minForGovernance',
  })
  
  const { data: minForMerchant } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'minForMerchant',
  })
  
  const { data: lowTrustThreshold } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'lowTrustThreshold',
  })
  
  const { data: highTrustThreshold } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'highTrustThreshold',
  })

  return {
    minForGovernance: minForGovernance ? Number(minForGovernance) : 5400,
    minForMerchant: minForMerchant ? Number(minForMerchant) : 5600,
    lowTrustThreshold: lowTrustThreshold ? Number(lowTrustThreshold) : 4000,
    highTrustThreshold: highTrustThreshold ? Number(highTrustThreshold) : 8000,
  }
}

/**
 * Hook to check if user has a specific badge
 */
export function useHasBadge(badgeId: `0x${string}`, userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'hasBadge',
    args: targetAddress && badgeId ? [targetAddress, badgeId] : undefined,
    query: {
      enabled: !!targetAddress && !!badgeId,
    }
  })

  return {
    hasBadge: !!data,
    isLoading,
  }
}
