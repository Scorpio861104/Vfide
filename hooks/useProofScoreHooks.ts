'use client'

import { useState } from 'react'
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, usePublicClient, useChainId } from 'wagmi'
import { isConfiguredContractAddress } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { SeerABI, SeerSocialABI } from '../lib/abis'
import { ZERO_ADDRESS } from '../lib/constants'
import { CURRENT_CHAIN_ID } from '../lib/testnet'
import { parseContractError, logError } from '@/lib/errorHandling';
import { safeBigIntToNumber } from '@/lib/validation';
import { PROOF_SCORE_PERMISSIONS } from '@/lib/constants';

// ============================================
// PROOFSCORE HOOKS - Live reputation tracking
// ============================================

export function useProofScore(userAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
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
  
  // Calculate tier and benefits (7-tier system per manual, 0-10000 scale)
  const tier =
    scoreNum >= 8000 ? 'Elite' :
    scoreNum >= 7000 ? 'Council' :
    scoreNum >= 5600 ? 'Trusted' :
    scoreNum >= 5400 ? 'Governance' :
    scoreNum >= 5000 ? 'Neutral' :
    scoreNum >= 4000 ? 'Low Trust' : 'Risky'
  
  // Total fees based on ProofScore (linear interpolation in contract)
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  // Linear interpolation: minBps=25 at score≥8000, maxBps=500 at score≤4000
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :  // Elite: 0.25% total (contract minimum)
    scoreNum >= 7000 ? 1.44 :  // Council: ~1.44% (linear at 7000)
    scoreNum >= 5600 ? 2.28 :  // Trusted: ~2.28% (midpoint 5600–6999 linear)
    scoreNum >= 5400 ? 3.34 :  // Governance: ~3.34% (linear at 5400)
    scoreNum >= 5000 ? 3.82 :  // Neutral: 3.82% (canonical neutral rate)
    scoreNum >= 4000 ? 4.22 :  // Low Trust: ~4.22% (interpolated midpoint 4000–4999)
    5.0                        // Risky (<4000): 5% max (contract maximum)
  
  const color =
    scoreNum >= 8000 ? '#00FF88' : // Elite green
    scoreNum >= 7000 ? '#A78BFA' : // Council purple
    scoreNum >= 5600 ? '#34D399' : // Trusted emerald
    scoreNum >= 5400 ? '#60A5FA' : // Governance blue
    scoreNum >= 5000 ? '#FFD700' : // Neutral gold
    scoreNum >= 4000 ? '#FFA500' : '#FF4444' // Low Trust orange (4000–4999) / Risky red (<4000)
  
  return {
    score: scoreNum,
    tier,
    burnFee,
    color,
    canVote: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE,
    canMerchant: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT,
    canCouncil: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_COUNCIL,
    canEndorse: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_ENDORSE,
    canMentor: scoreNum >= PROOF_SCORE_PERMISSIONS.MIN_FOR_MENTOR,
    isElite: scoreNum >= 8000,
    isLoading,
    refetch,
  }
}

export function useEndorse(targetAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
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
  const CONTRACT_ADDRESSES = useContractAddresses();
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
