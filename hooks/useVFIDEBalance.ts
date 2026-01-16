import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { VFIDETokenABI } from '@/lib/abis'
import { parseContractError } from '@/lib/errorHandling'
import { formatEther } from 'viem'

export function useVFIDEBalance(address?: `0x${string}`) {
  const { data, isError, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.VFIDEToken,
    }
  })

  return {
    balance: data,
    balanceFormatted: data ? formatEther(data as bigint) : '0',
    isError,
    isLoading,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}
