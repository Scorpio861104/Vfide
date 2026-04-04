'use client'

import { useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import {
  CONTRACT_ADDRESSES,
  getContractConfigurationError,
  isConfiguredContractAddress,
} from '@/lib/contracts'
import { SeerSocialABI } from '@/lib/abis'

type AppealStatus = {
  hasAppeal: boolean
  resolved: boolean
  approved: boolean
  timestamp?: number
  reason?: string
  resolution?: string
}

export function useAppealStatus(address?: `0x${string}`) {
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial)
    ? getContractConfigurationError('SeerSocial')
    : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'appeals',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && !configError },
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

  return { ...parsed, isLoading, error: configError ?? error, refetch, isAvailable: !configError }
}

export function useFileAppeal() {
  const { address } = useAccount()
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial)
    ? getContractConfigurationError('SeerSocial')
    : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const fileAppeal = (reason: string) => {
    if (!address || !reason || configError) return
    writeContract({
      address: CONTRACT_ADDRESSES.SeerSocial,
      abi: SeerSocialABI,
      functionName: 'fileAppeal',
      args: [reason],
    })
  }

  return {
    fileAppeal,
    isLoading: isPending || isConfirming,
    isSuccess,
    error: configError ?? error,
    isAvailable: !configError,
  }
}
