import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, SEER_ABI } from '@/lib/contracts'

export function useProofScore(address?: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SEER_ABI,
    functionName: 'getScore',
    args: address ? [address] : undefined,
  })

  return {
    score: data ? Number(data) : 0,
    isError,
    isLoading,
  }
}

export function getScoreTier(score: number): string {
  // Contract uses 0-10000 scale (10x precision)
  if (score >= 9000) return 'VERIFIED'
  if (score >= 7000) return 'TRUSTED'
  if (score >= 4000) return 'ESTABLISHED'
  if (score >= 2000) return 'PROBATIONARY'
  return 'UNRANKED'
}
