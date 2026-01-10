import { useReadContract, useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES, SEER_ABI } from '@/lib/contracts'
import { PROOF_SCORE_PERMISSIONS, PROOF_SCORE_TIERS } from '@/lib/constants'

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
  
  // Get current tier from unified constants
  const currentTier = getScoreTierObject(scoreNum)
  
  // Calculate burn fee based on ProofScore
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :
    scoreNum >= 7000 ? 1.0 :
    scoreNum >= 5000 ? 2.0 :
    scoreNum >= 4000 ? 3.5 :
    5.0

  return {
    score: scoreNum,
    tier: currentTier,
    tierName: currentTier.label,
    tierColor: currentTier.color,
    burnFee,
    color: getTierColor(scoreNum),
    canVote: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE,
    canMerchant: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT,
    canCouncil: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_COUNCIL,
    canEndorse: scoreNum >= 8000,
    isElite: scoreNum >= 8000,
    isError,
    isLoading,
    refetch,
  }
}

/**
 * Get tier object from ProofScore value with all tier details
 */
export function getScoreTierObject(score: number) {
  for (const tier of Object.values(PROOF_SCORE_TIERS)) {
    if (score >= tier.min && score < tier.max) {
      return tier
    }
  }
  return PROOF_SCORE_TIERS.ELITE
}

/**
 * Get tier name from ProofScore value (legacy helper)
 */
export function getScoreTier(score: number): string {
  return getScoreTierObject(score).label
}

/**
 * Get tier color from ProofScore value
 */
function getTierColor(score: number): string {
  if (score >= 8000) return '#00FF88' // Elite green
  if (score >= 7000) return '#00F0FF' // High trust cyan
  if (score >= 5000) return '#FFD700' // Neutral gold
  if (score >= 3500) return '#FFA500' // Low trust orange
  return '#FF4444' // Risky red
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
    minForGovernance: minForGovernance ? Number(minForGovernance) : PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE,
    minForMerchant: minForMerchant ? Number(minForMerchant) : PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT,
    lowTrustThreshold: lowTrustThreshold ? Number(lowTrustThreshold) : 3500,
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
