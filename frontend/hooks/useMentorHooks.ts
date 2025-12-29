'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { SeerABI } from '../lib/abis'

// ============================================
// MENTOR SYSTEM HOOKS - Help new users succeed
// ============================================

export function useIsMentor(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: isMentor, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'isMentor',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  return {
    isMentor: !!isMentor,
    isLoading,
  }
}

export function useBecomeMentor() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const becomeMentor = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: SeerABI,
      functionName: 'becomeMentor',
    })
  }
  
  return {
    becomeMentor,
    isLoading: isPending || isConfirming,
    isSuccess,
  }
}

export function useSponsorMentee(menteeAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const sponsorMentee = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: SeerABI,
      functionName: 'sponsorMentee',
      args: [menteeAddress],
    })
  }
  
  return {
    sponsorMentee,
    isSponsoring: isPending || isConfirming,
    isSuccess,
  }
}

export function useMentorInfo(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: mentorAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'mentorOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const { data: menteeCount } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'menteeCount',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const { data: highScoreAchievedAt } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'highScoreFirstAchievedAt',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const canBecomeMentor = highScoreAchievedAt && Number(highScoreAchievedAt) > 0
  // Return raw timestamp - component should calculate remaining days using useEffect
  const highScoreTimestamp = highScoreAchievedAt ? Number(highScoreAchievedAt) : null
  const mentorEligibleAt = highScoreTimestamp ? highScoreTimestamp + 30 * 24 * 60 * 60 : null
  
  return {
    mentorAddress: mentorAddress as `0x${string}` | undefined,
    hasMentor: mentorAddress && mentorAddress !== '0x0000000000000000000000000000000000000000',
    menteeCount: menteeCount ? Number(menteeCount) : 0,
    canBecomeMentor,
    highScoreTimestamp,
    mentorEligibleAt, // Component should compare this to current time
  }
}
