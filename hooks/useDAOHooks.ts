'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '../lib/contracts'
import { DAOABI } from '../lib/abis'

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.DAO)

  const { data: proposalCount } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: { enabled: isAvailable },
  })
  
  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
    isAvailable,
  }
}

export function useVote() {
  const { writeContract, data, isPending } = useWriteContract()
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.DAO)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const vote = (proposalId: bigint, support: boolean) => {
    if (!isAvailable) return
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
    isAvailable,
  }
}
