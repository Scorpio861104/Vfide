'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { VFIDEBadgeNFTABI, SeerABI } from '../lib/abis'

// ============================================
// BADGE HOOKS - Badge system integration
// ============================================

export function useUserBadges(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: badgeIds, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getUserBadges',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  return {
    badgeIds: (badgeIds as `0x${string}`[]) || [],
    isLoading,
    refetch,
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
    tokenIds: tokenIds || [],
    count: tokenIds ? tokenIds.length : 0,
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
    canMint: data ? data[0] : false,
    reason: data ? data[1] : '',
    isLoading,
  }
}
