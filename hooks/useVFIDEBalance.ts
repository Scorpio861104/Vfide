import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, VFIDE_TOKEN_ABI } from '@/lib/contracts'

export function useVFIDEBalance(address?: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACT_ADDRESSES.VFIDEToken !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10_000,
    }
  })

  return {
    balance: data,
    isError,
    isLoading,
  }
}
