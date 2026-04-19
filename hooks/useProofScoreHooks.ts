'use client'

import { useState } from 'react'
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, usePublicClient, useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '../lib/contracts'
import { SeerABI, SeerSocialABI } from '../lib/abis'
import { ZERO_ADDRESS } from '../lib/constants'
import { CURRENT_CHAIN_ID } from '../lib/testnet'
import { parseContractError, logError } from '@/lib/errorHandling';
import { safeBigIntToNumber } from '@/lib/validation';

// ============================================
// PROOFSCORE HOOKS - Live reputation tracking
// ============================================

export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  const hasSeerConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  
  const { data: score, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && hasSeerConfig,
    }
  })
  
  const scoreNum = score !== undefined && score !== null
    ? (typeof score === 'bigint' ? safeBigIntToNumber(score, 0) : Number(score))
    : 5000 // Default neutral score (10x scale) when contract hasn't responded yet
  
  // Calculate tier and benefits (updated for 10x scale: 0-10000)
  const tier = 
    scoreNum >= 8000 ? 'Elite' :
    scoreNum >= 7000 ? 'High Trust' :
    scoreNum >= 5000 ? 'Neutral' :
    scoreNum >= 3500 ? 'Low Trust' : 'Risky'
  
  // Total fees based on ProofScore (linear interpolation in contract)
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  // Neutral (5000) is the midpoint → 2.5%
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :  // Elite: 0.25% total (contract minimum)
    scoreNum >= 7000 ? 1.0 :   // High Trust: ~1% (interpolated)
    scoreNum >= 5000 ? 2.5 :   // Neutral: 2.5% (midpoint of fee range)
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
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const hasSeerSocialConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const endorse = async (reason = 'endorsement') => {
    setError(null)
    if (!targetAddress || targetAddress === ZERO_ADDRESS) {
      setError('Invalid target address')
      return { success: false, error: 'Invalid target address' }
    }
    if (!hasSeerSocialConfig) {
      const message = 'SeerSocial contract is not configured'
      setError(message)
      return { success: false, error: message }
    }
    if (chainId !== CURRENT_CHAIN_ID) {
      const message = 'Switch to the configured network before endorsing'
      setError(message)
      return { success: false, error: message }
    }
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.SeerSocial,
        abi: SeerSocialABI,
        functionName: 'endorse',
        args: [targetAddress, reason],
        chainId: CURRENT_CHAIN_ID,
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { success: true, hash }
    } catch (err: unknown) {
      logError('endorse', err);
      const parsed = parseContractError(err);
      const errorMsg = `Failed to endorse: ${parsed.userMessage}`;
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
    isAvailable: !!targetAddress && hasSeerSocialConfig,
  }
}

/**
/**
 * Score breakdown hook - Breakdown of a user's proof score components
 */
export function useScoreBreakdown(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  const hasSeerConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && hasSeerConfig,
    }
  })
  
  const totalScore = data ? Number(data) : 5000

  // Component-level score decomposition is unavailable until ProofLedger exposes breakdown reads.
  return {
    breakdown: {
      totalScore,
      baseScore: 0,
      activityBonus: 0,
      ageBonus: 0,
      activityPoints: 0,
      endorsementPoints: 0,
      vaultBonus: 0,
      badgePoints: 0,
      reputationDelta: 0,
      hasDiversityBonus: false,
    },
    isLoading,
    refetch,
  }
}
