'use client'

import { useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

const SEER_APPEALS_ABI = [
  {
    name: 'appeals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [
      { type: 'address' }, // requester
      { type: 'string' },  // reason
      { type: 'uint64' },  // timestamp
      { type: 'bool' },    // resolved
      { type: 'bool' },    // approved
      { type: 'string' },  // resolution
    ],
  },
  {
    name: 'fileAppeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reason', type: 'string' }],
    outputs: [],
  },
] as const

type AppealStatus = {
  hasAppeal: boolean
  resolved: boolean
  approved: boolean
  timestamp?: number
  reason?: string
  resolution?: string
}

export function useAppealStatus(address?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_APPEALS_ABI,
    functionName: 'appeals',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const parsed = useMemo<AppealStatus>(() => {
    const tuple = data as
      | readonly [`0x${string}`, string, bigint, boolean, boolean, string]
      | undefined
    if (!tuple) return { hasAppeal: false, resolved: false, approved: false }

    const [, reason, timestamp, resolved, approved, resolution] = tuple
    return {
      hasAppeal: Boolean(timestamp && timestamp !== 0n),
      resolved,
      approved,
      timestamp: Number(timestamp ?? 0n) * 1000,
      reason,
      resolution,
    }
  }, [data])

  return { ...parsed, isLoading, error, refetch }
}

export function useFileAppeal() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const fileAppeal = (reason: string) => {
    if (!address || !reason) return
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: SEER_APPEALS_ABI,
      functionName: 'fileAppeal',
      args: [reason],
    })
  }

  return { fileAppeal, isLoading: isPending || isConfirming, isSuccess, error }
}
