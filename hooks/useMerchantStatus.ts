import { useReadContract } from 'wagmi'
import { MerchantPortalABI, isConfiguredContractAddress } from '@/lib/contracts'
import { useContractAddresses } from './useContractAddresses'

/**
 * Check if an address is a registered merchant
 * Uses getMerchantInfo which returns (registered, suspended, businessName, category, registeredAt, totalVolume, txCount)
 */
export function useMerchantStatus(address?: `0x${string}`) {
  const addresses = useContractAddresses();
  const isAvailable = isConfiguredContractAddress(addresses.MerchantPortal)

  const { data, isError, isLoading } = useReadContract({
    address: addresses.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getMerchantInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isAvailable,
    }
  })

  // getMerchantInfo returns: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount)
  const info = data as [boolean, boolean, string, string, bigint, bigint, bigint] | undefined

  return {
    isMerchant: info?.[0] || false,
    isSuspended: info?.[1] || false,
    isError,
    isLoading,
    isAvailable,
  }
}
