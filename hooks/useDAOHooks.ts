'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { isConfiguredContractAddress } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { DAOABI } from '../lib/abis'

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const addresses = useContractAddresses();
  const isAvailable = isConfiguredContractAddress(addresses.DAO)

  const { data: proposalCount } = useReadContract({
    address: addresses.DAO,
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
  const addresses = useContractAddresses();
  const { writeContract, data, isPending } = useWriteContract()
  const isAvailable = isConfiguredContractAddress(addresses.DAO)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const vote = (proposalId: bigint, support: boolean) => {
    if (!isAvailable) return
    writeContract({
      address: addresses.DAO,
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
