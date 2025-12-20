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
  if (score >= 900) return 'VERIFIED'
  if (score >= 700) return 'TRUSTED'
  if (score >= 400) return 'ESTABLISHED'
  if (score >= 200) return 'PROBATIONARY'
  return 'UNRANKED'
}
