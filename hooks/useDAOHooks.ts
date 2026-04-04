'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import {
  CONTRACT_ADDRESSES,
  getContractConfigurationError,
  isConfiguredContractAddress,
} from '../lib/contracts'
import { DAOABI } from '../lib/abis'

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.DAO)
    ? getContractConfigurationError('DAO')
    : null

  const { data: proposalCount, error } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: {
      enabled: !configError,
    },
  })
  
  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
    error: configError ?? error,
    isAvailable: !configError,
  }
}

export function useVote() {
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.DAO)
    ? getContractConfigurationError('DAO')
    : null
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const vote = (proposalId: bigint, support: boolean) => {
    if (configError) return

    writeContract({
      address: CONTRACT_ADDRESSES.DAO,
      abi: DAOABI,
      functionName: 'vote',
      args: [proposalId, support],
    })
  }
  
  return {
    vote,
    isVoting: isPending || isConfirming,
    isSuccess,
    error: configError ?? error,
    isAvailable: !configError,
  }
}
