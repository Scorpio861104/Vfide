'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { VFIDEBadgeNFTABI } from '../lib/abis'

// ============================================
// BADGE HOOKS - Badge system integration
// ============================================

/**
 * Get user badges - uses Seer hasBadge for checking specific badges
 * Note: Seer doesn't have getUserBadges - use useBadgeNFTs for NFT-based badges
 * or check specific badges with useHasBadge
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
  
  const { data: tokenIds, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: VFIDEBadgeNFTABI,
    functionName: 'getBadgesOfUser',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.BadgeNFT,
    }
  })
  
  return {
    tokenIds: (tokenIds as bigint[]) || [],
    count: tokenIds ? (tokenIds as bigint[]).length : 0,
    isLoading,
    refetch,
  }
}

export function useMintBadge() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const mintBadge = (badgeId: `0x${string}`) => {
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
  }
}

export function useCanMintBadge(badgeId: `0x${string}`, address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: VFIDEBadgeNFTABI,
    functionName: 'canMintBadge',
    args: targetAddress && badgeId ? [targetAddress, badgeId] : undefined,
    query: {
      enabled: !!targetAddress && !!badgeId && !!CONTRACT_ADDRESSES.BadgeNFT,
    }
  })
  
  return {
    canMint: data ? (data as [boolean, string])[0] : false,
    reason: data ? (data as [boolean, string])[1] : '',
    isLoading,
  }
}
