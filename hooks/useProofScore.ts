import { useReadContract, useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES, ProofScoreBurnRouterABI, SeerABI, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts'
import { PROOF_SCORE_PERMISSIONS, PROOF_SCORE_TIERS } from '@/lib/constants'

const FEE_QUOTE_AMOUNT = 10_000n * 10n ** 18n

/**
 * Hook to fetch user's ProofScore from the Seer contract
 * ProofScore is a reputation score (0-10000 scale) that affects transfer fees
 */
export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  const hasSeerConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  const hasBurnRouterConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.BurnRouter)

  const { data, isError, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && hasSeerConfig,
    }
  })

  const { data: onChainFeeQuote } = useReadContract({
    address: CONTRACT_ADDRESSES.BurnRouter,
    abi: ProofScoreBurnRouterABI,
    functionName: 'computeFees',
    args: targetAddress ? [targetAddress, targetAddress, FEE_QUOTE_AMOUNT] : undefined,
    query: {
      enabled:
        !!targetAddress &&
        hasBurnRouterConfig,
    },
  })

  const scoreNum = data ? Number(data) : 5000 // Default neutral score (10x scale); new users with no on-chain score start at 5000
  
  // Get current tier from unified constants
  const currentTier = getScoreTierObject(scoreNum)
  
  // Calculate burn fee based on ProofScore
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  // Neutral score (5000) sits at the midpoint → 2.5%
  const fallbackBurnFee =
    scoreNum >= 8000 ? 0.25 :
    scoreNum >= 7000 ? 1.0 :
    scoreNum >= 5000 ? 2.5 :
    scoreNum >= 4000 ? 3.5 :
    5.0
  const burnFee = onChainFeeQuote !== undefined
    ? (() => {
        if (!Array.isArray(onChainFeeQuote)) return fallbackBurnFee
        const burnAmount = Number(onChainFeeQuote[0] ?? 0n)
        const sanctumAmount = Number(onChainFeeQuote[1] ?? 0n)
        const ecosystemAmount = Number(onChainFeeQuote[2] ?? 0n)
        const totalFees = burnAmount + sanctumAmount + ecosystemAmount
        return (totalFees / Number(FEE_QUOTE_AMOUNT)) * 100
      })()
    : fallbackBurnFee

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
  const hasSeerConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)

  const { data: minForGovernance } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'minForGovernance',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: minForMerchant } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'minForMerchant',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: lowTrustThreshold } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'lowTrustThreshold',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: highTrustThreshold } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'highTrustThreshold',
    query: { enabled: hasSeerConfig },
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
  const hasSeerConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'hasBadge',
    args: targetAddress && badgeId ? [targetAddress, badgeId] : undefined,
    query: {
      enabled: !!targetAddress && !!badgeId && hasSeerConfig,
    }
  })

  return {
    hasBadge: !!data,
    isLoading,
  }
}
