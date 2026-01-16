'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { DAOABI } from '../lib/abis'
import { parseContractError } from '@/lib/errorHandling'

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const { data: proposalCount, isLoading, isError, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: {
      staleTime: 60_000, // Proposals don't change frequently
    }
  })
  
  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
    isLoading,
    isError,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}

export function useVote() {
  const { writeContract, data, isPending, error: writeError, isError: isWriteError } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, error: txError } = useWaitForTransactionReceipt({
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
    error: (writeError || txError) ? parseContractError(writeError || txError).userMessage : null,
    isError: isWriteError,
    txHash: data,
  }
}
