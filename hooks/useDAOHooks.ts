'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { DAOABI } from '../lib/abis'

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const { data: proposalCount } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAOABI,
    functionName: 'proposalCount',
  })
  
  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
  }
}

export function useVote() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const vote = (proposalId: bigint, support: boolean) => {
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
  }
}
