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
  
  return {
    isMerchant: merchantInfo?.[0] || false,
    isSuspended: merchantInfo?.[1] || false,
    businessName: merchantInfo?.[2] || '',
    category: merchantInfo?.[3] || '',
    registeredAt: merchantInfo?.[4] ? Number(merchantInfo[4]) : 0,
    totalVolume: merchantInfo?.[5] ? formatEther(merchantInfo[5]) : '0',
    txCount: merchantInfo?.[6] ? Number(merchantInfo[6]) : 0,
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
  
  return {
    score: data?.[0] ? Number(data[0]) : 5000,
    highTrust: data?.[1] || false,
    lowTrust: data?.[2] || false,
    eligible: data?.[3] || false,
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
