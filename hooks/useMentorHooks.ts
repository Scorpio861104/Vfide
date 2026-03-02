'use client'

import { useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { SeerSocialABI } from '@/lib/abis'

type MentorInfo = {
  isMentor: boolean
  mentor?: `0x${string}`
  menteeCount: number
  hasMentor: boolean
  canBecomeMentor: boolean
  minScoreToMentor: number
  currentScore: number
  mentees?: `0x${string}`[]
}

export function useMentorInfo(address?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'getMentorInfo',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const { data: menteesData } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'getMentees',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const parsed = useMemo<MentorInfo>(() => {
    const tuple = data as
      | readonly [boolean, `0x${string}`, bigint, boolean, boolean, bigint, bigint]
      | undefined

    return {
      isMentor: tuple?.[0] ?? false,
      mentor: tuple?.[1],
      menteeCount: Number(tuple?.[2] ?? 0n),
      hasMentor: tuple?.[3] ?? false,
      canBecomeMentor: tuple?.[4] ?? false,
      minScoreToMentor: Number(tuple?.[5] ?? 0n),
      currentScore: Number(tuple?.[6] ?? 0n),
      mentees: (menteesData as `0x${string}`[] | undefined) ?? [],
    }
  }, [data, menteesData])

  return {
    ...parsed,
    isLoading,
    error,
    refetch,
    isAvailable: true,
  }
}

export function useIsMentor(address?: `0x${string}`) {
  const info = useMentorInfo(address)
  return {
    isMentor: info.isMentor,
    isLoading: info.isLoading,
    isAvailable: info.isAvailable,
  }
}

export function useBecomeMentor() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({ hash })

  const becomeMentor = () => {
    if (!address) return
    writeContract({
      address: CONTRACT_ADDRESSES.SeerSocial,
      abi: SeerSocialABI,
      functionName: 'becomeMentor',
      args: [],
    })
  }

  return { becomeMentor, isLoading: isPending || isConfirming, isSuccess, error, isAvailable: true }
}

export function useSponsorMentee(menteeAddress?: `0x${string}`) {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({ hash })

  const sponsorMentee = () => {
    if (!address || !menteeAddress) return
    writeContract({
      address: CONTRACT_ADDRESSES.SeerSocial,
      abi: SeerSocialABI,
      functionName: 'sponsorMentee',
      args: [menteeAddress],
    })
  }

  return { sponsorMentee, isSponsoring: isPending || isConfirming, isSuccess, error, isAvailable: true }
}
