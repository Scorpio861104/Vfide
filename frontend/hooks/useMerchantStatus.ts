import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, MERCHANT_PORTAL_ABI } from '@/lib/contracts'

export function useMerchantStatus(address?: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MERCHANT_PORTAL_ABI,
    functionName: 'isMerchant',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.MerchantPortal,
    }
  })

  return {
    isMerchant: data || false,
    isError,
    isLoading,
  }
}
