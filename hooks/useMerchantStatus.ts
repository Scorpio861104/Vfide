import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, MERCHANT_PORTAL_ABI } from '@/lib/contracts'

/**
 * Check if an address is a registered merchant
 * Uses getMerchantInfo which returns (registered, suspended, businessName, category, registeredAt, totalVolume, txCount)
 */
export function useMerchantStatus(address?: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MERCHANT_PORTAL_ABI,
    functionName: 'getMerchantInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACT_ADDRESSES.MerchantPortal !== '0x0000000000000000000000000000000000000000',
    }
  })

  // getMerchantInfo returns: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount)
  const info = data as [boolean, boolean, string, string, bigint, bigint, bigint] | undefined

  return {
    isMerchant: info?.[0] || false,
    isSuspended: info?.[1] || false,
    isError,
    isLoading,
  }
}
