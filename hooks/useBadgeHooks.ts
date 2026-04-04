'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import {
  CONTRACT_ADDRESSES,
  getContractConfigurationError,
  isConfiguredContractAddress,
} from '../lib/contracts'
import { VFIDEBadgeNFTABI } from '../lib/abis'

// ============================================
// BADGE HOOKS - Badge system integration
// ============================================

/**
 * Get user badges - uses Seer hasBadge for checking specific badges
 * Note: Seer doesn't have getUserBadges - use useBadgeNFTs for NFT-based badges
 * or check specific badges with useHasBadge
 * @deprecated Use useBadgeNFTs instead
 */
 
export function useUserBadges(_address?: `0x${string}`) {
 
  // Seer doesn't have getUserBadges function
  // Instead, use useBadgeNFTs for NFT badges or check known badge IDs
  // This hook returns an empty array - use useBadgeNFTs instead
  // Note: This is a deprecated hook, use useBadgeNFTs for actual badge data
  
  return {
    badgeIds: [] as `0x${string}`[],
    isLoading: false,
    refetch: () => Promise.resolve(),
    isAvailable: false, // Flag that this hook is not functional
  }
}

export function useBadgeNFTs(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.BadgeNFT)
    ? getContractConfigurationError('BadgeNFT')
    : null
  
  const { data: tokenIds, isLoading, refetch, error } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: VFIDEBadgeNFTABI,
    functionName: 'getBadgesOfUser',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && !configError,
    }
  })
  
  return {
    tokenIds: (tokenIds as bigint[]) || [],
    count: tokenIds ? (tokenIds as bigint[]).length : 0,
    isLoading,
    refetch,
    error: configError ?? error,
    isAvailable: !configError,
  }
}

export function useMintBadge() {
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.BadgeNFT)
    ? getContractConfigurationError('BadgeNFT')
    : null
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const mintBadge = (badgeId: `0x${string}`) => {
    if (configError) return

    writeContract({
      address: CONTRACT_ADDRESSES.BadgeNFT,
      abi: VFIDEBadgeNFTABI,
      functionName: 'mintBadge',
      args: [badgeId],
    })
  }
  
  return {
    mintBadge,
    isMinting: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error: configError ?? error,
    isAvailable: !configError,
  }
}

export function useCanMintBadge(badgeId: `0x${string}`, address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  const configError = !isConfiguredContractAddress(CONTRACT_ADDRESSES.BadgeNFT)
    ? getContractConfigurationError('BadgeNFT')
    : null
  
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: VFIDEBadgeNFTABI,
    functionName: 'canMintBadge',
    args: targetAddress && badgeId ? [targetAddress, badgeId] : undefined,
    query: {
      enabled: !!targetAddress && !!badgeId && !configError,
    }
  })
  
  return {
    canMint: data ? (data as [boolean, string])[0] : false,
    reason: data ? (data as [boolean, string])[1] : '',
    isLoading,
    error: configError ?? error,
    isAvailable: !configError,
  }
}
