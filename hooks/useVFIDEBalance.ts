import { useReadContract } from 'wagmi'
import { VFIDETokenABI, isConfiguredContractAddress } from '@/lib/contracts'
import { useContractAddresses } from './useContractAddresses'

export function useVFIDEBalance(address?: `0x${string}`) {
  const addresses = useContractAddresses();
  const isAvailable = isConfiguredContractAddress(addresses.VFIDEToken)

  const { data, isError, isLoading } = useReadContract({
    address: addresses.VFIDEToken,
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
