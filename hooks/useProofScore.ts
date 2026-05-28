import { useReadContract, useAccount } from 'wagmi'
import { ProofScoreBurnRouterABI, SeerABI, isConfiguredContractAddress } from '@/lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { PROOF_SCORE_PERMISSIONS, PROOF_SCORE_TIERS } from '@/lib/constants'

const FEE_QUOTE_AMOUNT = 10_000n * 10n ** 18n

/**
 * Hook to fetch user's ProofScore from the Seer contract
 * ProofScore is a reputation score (0-10000 scale) that affects transfer fees
 */
export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const contractAddresses = useContractAddresses()
  const targetAddress = userAddress || connectedAddress
  const hasSeerConfig = isConfiguredContractAddress(contractAddresses.Seer)
  const hasBurnRouterConfig = isConfiguredContractAddress(contractAddresses.ProofScoreBurnRouter)

  const { data, isError, isLoading, refetch } = useReadContract({
    address: contractAddresses.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && hasSeerConfig,
    }
  })

  const { data: onChainFeeQuote } = useReadContract({
    address: contractAddresses.ProofScoreBurnRouter,
    abi: ProofScoreBurnRouterABI,
    functionName: 'computeFees',
    args: targetAddress ? [targetAddress, targetAddress, FEE_QUOTE_AMOUNT] : undefined,
    query: {
      enabled:
        !!targetAddress &&
        hasBurnRouterConfig,
    },
  })

  // When no address is connected, return null so UIs can show "connect wallet" 
  // instead of misleadingly showing a neutral 5000 score as the user's own.
  const scoreNum = !targetAddress ? null : (data ? Number(data) : 5000)
  
  // Get current tier from unified constants
  const currentTier = scoreNum !== null ? getScoreTierObject(scoreNum) : null
  
  // Calculate burn fee based on ProofScore
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  // Neutral score (5000): 500 − ((5000−4000)×475)/4000 = 381.25 bps = 3.8125%
  // Linear interpolation matching ProofScoreBurnRouter.sol computeFees():
  //   score ≤ 4000 (LOW_SCORE_THRESHOLD) → maxTotalBps = 500 bps = 5.00%
  //   score ≥ 8000 (HIGH_SCORE_THRESHOLD) → minTotalBps = 25 bps = 0.25%
  //   4000–8000 → linear: maxBps - ((score - 4000) * (maxBps - minBps)) / 4000
  const MIN_BPS = 25;   // 0.25% — ProofScoreBurnRouter.minTotalBps
  const MAX_BPS = 500;  // 5.00% — ProofScoreBurnRouter.maxTotalBps
  const fallbackBurnFee = scoreNum === null ? null :
    scoreNum >= 8000 ? MIN_BPS / 100 :
    scoreNum <= 4000 ? MAX_BPS / 100 :
    (MAX_BPS - ((scoreNum - 4000) * (MAX_BPS - MIN_BPS)) / 4000) / 100
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
    /** True when no wallet is connected — score is null, not a real value */
    isDisconnected: !targetAddress,
    tier: currentTier,
    tierName: currentTier?.label ?? null,
    tierColor: currentTier?.color ?? null,
    burnFee,
    color: scoreNum !== null ? getTierColor(scoreNum) : '#71717a',
    canVote: (scoreNum ?? 0) >= PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE,
    canMerchant: (scoreNum ?? 0) >= PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT,
    canCouncil: (scoreNum ?? 0) >= PROOF_SCORE_PERMISSIONS.MIN_FOR_COUNCIL,
    canEndorse: (scoreNum ?? 0) >= PROOF_SCORE_PERMISSIONS.MIN_FOR_ENDORSE,
    canMentor: (scoreNum ?? 0) >= PROOF_SCORE_PERMISSIONS.MIN_FOR_MENTOR,
    isElite: (scoreNum ?? 0) >= 8000,
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
  if (score >= 4000) return '#FFA500' // Low trust orange
  return '#FF4444' // Risky red
}

/**
 * Hook to read Seer thresholds from contract
 */
export function useSeerThresholds() {
  const contractAddresses = useContractAddresses()
  const hasSeerConfig = isConfiguredContractAddress(contractAddresses.Seer)

  const { data: minForGovernance } = useReadContract({
    address: contractAddresses.Seer,
    abi: SeerABI,
    functionName: 'minForGovernance',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: minForMerchant } = useReadContract({
    address: contractAddresses.Seer,
    abi: SeerABI,
    functionName: 'minForMerchant',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: lowTrustThreshold } = useReadContract({
    address: contractAddresses.Seer,
    abi: SeerABI,
    functionName: 'lowTrustThreshold',
    query: { enabled: hasSeerConfig },
  })
  
  const { data: highTrustThreshold } = useReadContract({
    address: contractAddresses.Seer,
    abi: SeerABI,
    functionName: 'highTrustThreshold',
    query: { enabled: hasSeerConfig },
  })

  return {
    minForGovernance: minForGovernance ? Number(minForGovernance) : PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE,
    minForMerchant: minForMerchant ? Number(minForMerchant) : PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT,
    lowTrustThreshold: lowTrustThreshold ? Number(lowTrustThreshold) : 4000,
    highTrustThreshold: highTrustThreshold ? Number(highTrustThreshold) : 8000,
  }
}

/**
 * Hook to check if user has a specific badge
 */
export function useHasBadge(badgeId: `0x${string}`, userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const contractAddresses = useContractAddresses()
  const targetAddress = userAddress || connectedAddress
  const hasSeerConfig = isConfiguredContractAddress(contractAddresses.Seer)

  const { data, isLoading } = useReadContract({
    address: contractAddresses.Seer,
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
