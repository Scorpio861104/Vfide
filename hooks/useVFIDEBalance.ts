import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, VFIDETokenABI, isConfiguredContractAddress } from '@/lib/contracts'

export function useVFIDEBalance(address?: `0x${string}`) {
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken)

  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isAvailable,
      refetchInterval: 10_000,
    }
  })

  return {
    balance: data,
    isError,
    isLoading,
    isAvailable,
  }
}
