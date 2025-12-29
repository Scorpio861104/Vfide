'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { MerchantPortalABI } from '../lib/abis'

// ============================================
// MERCHANT HOOKS - No processor fees (burn + gas apply)
// ============================================

export function useIsMerchant(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: merchantInfo, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getMerchantInfo',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MerchantPortal,
    }
  })
  
  const info = merchantInfo as [boolean, boolean, string, bigint, bigint] | undefined

  return {
    isMerchant: info?.[0] || false,
    isSuspended: info?.[1] || false,
    businessName: info?.[2] || '',
    category: info?.[3] || '',
    registeredAt: info?.[4] ? Number(info[4]) : 0,
    totalVolume: info?.[5] ? formatEther(info[5]) : '0',
    txCount: info?.[6] ? Number(info[6]) : 0,
    isLoading,
    refetch,
  }
}

export function useRegisterMerchant() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const registerMerchant = (businessName: string, category: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'registerMerchant', // Assuming this exists in ABI
      args: [businessName, category],
    })
  }
  
  return {
    registerMerchant,
    isRegistering: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Process payment from customer to merchant (merchant-initiated)
 */
export function useProcessPayment() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const processPayment = (
    customer: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'processPayment',
      args: [customer, token, parseEther(amount), orderId],
    })
  }
  
  return {
    processPayment,
    isProcessing: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Pay merchant (customer-initiated)
 */
export function usePayMerchant() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const payMerchant = (
    merchant: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'pay',
      args: [merchant, token, parseEther(amount), orderId],
    })
  }
  
  return {
    payMerchant,
    isPaying: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Get customer trust assessment for merchants
 */
export function useCustomerTrustScore(customerAddress?: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getCustomerTrustScore',
    args: customerAddress ? [customerAddress] : undefined,
    query: {
      enabled: !!customerAddress && !!CONTRACT_ADDRESSES.MerchantPortal,
    }
  })
  
  const info = data as any[] | undefined
  
  return {
    score: info?.[0] ? Number(info[0]) : 5000,
    highTrust: info?.[1] || false,
    lowTrust: info?.[2] || false,
    eligible: info?.[3] || false,
    isLoading,
  }
}

/**
 * Enable/disable auto-conversion to stablecoins (STABLE-PAY)
 */
export function useSetAutoConvert() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setAutoConvert = (enabled: boolean) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'setAutoConvert',
      args: [enabled],
    })
  }
  
  return {
    setAutoConvert,
    isSetting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Set custom payout address for merchant
 */
export function useSetPayoutAddress() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setPayoutAddress = (payoutAddress: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: MerchantPortalABI,
      functionName: 'setPayoutAddress',
      args: [payoutAddress],
    })
  }
  
  return {
    setPayoutAddress,
    isSetting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}
