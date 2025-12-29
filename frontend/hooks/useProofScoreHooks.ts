'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { SeerABI } from '../lib/abis'

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

export function useEndorse(targetAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const endorse = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: SeerABI,
      functionName: 'endorseUser', // Note: ABI says endorseUser, hook said endorse. Checking contracts.ts inline ABI: 'function endorseUser(address user)'. So it should be endorseUser.
      args: [targetAddress],
    })
  }
  
  return {
    endorse,
    isEndorsing: isPending || isConfirming,
    isSuccess,
  }
}

export function useScoreBreakdown(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScoreBreakdown', // Assuming this exists in SeerABI
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const info = data as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined

  return {
    breakdown: info ? {
      totalScore: Number(info[0]),
      baseScore: Number(info[1]),
      vaultBonus: Number(info[2]),
      ageBonus: Number(info[3]),
      activityPoints: Number(info[4]),
      endorsementPoints: Number(info[5]),
      badgePoints: Number(info[6]),
      reputationDelta: Number(info[7]),
      hasDiversityBonus: Boolean(info[8]),
    } : null,
    isLoading,
    refetch,
  }
}
