'use client'

import { useState } from 'react'
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { SeerABI } from '../lib/abis'
import { ZERO_ADDRESS } from '../lib/constants'

// ============================================
// PROOFSCORE HOOKS - Live reputation tracking
// ============================================

export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  
  const { data: score, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const scoreNum = score ? Number(score) : 5000 // Default neutral score (10x scale)
  
  // Calculate tier and benefits (updated for 10x scale: 0-10000)
  const tier = 
    scoreNum >= 8000 ? 'Elite' :
    scoreNum >= 7000 ? 'High Trust' :
    scoreNum >= 5000 ? 'Neutral' :
    scoreNum >= 3500 ? 'Low Trust' : 'Risky'
  
  // Total fees based on ProofScore (linear interpolation in contract)
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :  // Elite: 0.25% total (contract minimum)
    scoreNum >= 7000 ? 1.0 :   // High Trust: ~1% (interpolated)
    scoreNum >= 5000 ? 2.0 :   // Neutral: ~2% (interpolated)
    scoreNum >= 4000 ? 3.5 :   // Low Trust: ~3.5% (interpolated)
    5.0                        // Risky (≤4000): 5% max (contract maximum)
  
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
    isLoading,
    refetch,
  }
}

export function useEndorse(targetAddress?: `0x${string}`) {
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const endorse = async (reason = 'endorsement') => {
    setError(null)
    if (!targetAddress || targetAddress === ZERO_ADDRESS) {
      setError('Invalid target address')
      return { success: false, error: 'Invalid target address' }
    }
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.Seer,
        abi: SeerABI,
        functionName: 'endorse',
        args: [targetAddress, reason],
      })
      return { success: true }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Endorsement failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }
  
  return {
    endorse,
    isEndorsing: isPending || isConfirming,
    isSuccess,
    error,
    isValid: !!targetAddress && targetAddress !== ZERO_ADDRESS,
    isAvailable: !!targetAddress,
  }
}

/**
/**
 * Score breakdown hook - Breakdown of a user's proof score components
 */
export function useScoreBreakdown(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const totalScore = data ? Number(data) : 5000

  // Simulated breakdown based on total score
  // In production, fetch individual components from ProofLedger
  return {
    breakdown: {
      totalScore,
      baseScore: Math.floor(totalScore * 0.4),
      activityBonus: Math.floor(totalScore * 0.3),
      ageBonus: Math.floor(totalScore * 0.1),
      activityPoints: Math.floor(totalScore * 0.15),
      endorsementPoints: Math.floor(totalScore * 0.1),
      vaultBonus: 0,
      badgePoints: 0,
      reputationDelta: 0,
      hasDiversityBonus: totalScore >= 7000,
    },
    isLoading,
    refetch,
  }
}
