'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseEther, formatEther, isAddress } from 'viem'
import { useState } from 'react'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { MerchantPortalABI } from '../lib/abis'
import { parseContractError, logError } from '@/lib/errorHandling';
import { safeBigIntToNumber } from '@/lib/validation';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// ============================================
// MERCHANT HOOKS - No processor fees (burn + gas apply)
// ============================================

// Type matches MerchantPortal.sol getMerchantInfo return:
// (bool registered, bool suspended, string businessName, string category, uint64 registeredAt, uint256 totalVolume, uint256 txCount)
type MerchantInfo = [boolean, boolean, string, string, bigint, bigint, bigint]

export function useIsMerchant(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: merchantInfo, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getMerchantInfo',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && CONTRACT_ADDRESSES.MerchantPortal !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const info = merchantInfo as MerchantInfo | undefined

  return {
    isMerchant: info?.[0] || false,
    isSuspended: info?.[1] || false,
    businessName: info?.[2] || '',
    category: info?.[3] || '',
    registeredAt: info?.[4] ? safeBigIntToNumber(info[4], 0) : 0,
    totalVolume: info?.[5] ? formatEther(info[5]) : '0',
    txCount: info?.[6] ? safeBigIntToNumber(info[6], 0) : 0,
    isLoading,
    refetch,
  }
}

export function useRegisterMerchant() {
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const registerMerchant = async (businessName: string, category: string) => {
    setError(null)
    try {
      if (CONTRACT_ADDRESSES.MerchantPortal === ZERO_ADDRESS) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!businessName.trim() || !category.trim()) {
        throw new Error('Business name and category are required')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'registerMerchant',
        args: [businessName.trim(), category.trim()],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { success: true, hash }
    } catch (err: unknown) {
      logError('registerMerchant', err);
      const parsed = parseContractError(err);
      const errorMsg = `Failed to register merchant: ${parsed.userMessage}`;
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }
  
  return {
    registerMerchant,
    isRegistering: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error,
  }
}

/**
 * Process payment from customer to merchant (merchant-initiated)
 */
export function useProcessPayment() {
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const processPayment = async (
    customer: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    setError(null)
    try {
      if (CONTRACT_ADDRESSES.MerchantPortal === ZERO_ADDRESS) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!isAddress(customer) || customer.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Customer must be a valid non-zero address')
      }
      if (!isAddress(token) || token.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Payment token must be a valid non-zero address')
      }
      if (!amount || Number(amount) <= 0) {
        throw new Error('Amount must be greater than zero')
      }
      if (!orderId.trim()) {
        throw new Error('Order ID is required')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'processPayment',
        args: [customer, token, parseEther(amount), orderId.trim()],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { success: true, hash }
    } catch (err: unknown) {
      logError('processPayment', err);
      const parsed = parseContractError(err);
      const errorMsg = `Failed to process payment: ${parsed.userMessage}`;
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }
  
  return {
    processPayment,
    isProcessing: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error,
  }
}

/**
 * Set a scoped merchant pull permit for merchant-initiated payments.
 */
export function useSetMerchantPullPermit() {
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })

  const setMerchantPullPermit = async (
    merchant: `0x${string}`,
    maxAmount: string,
    expiresAt: bigint | number = 0
  ) => {
    setError(null)
    try {
      if (CONTRACT_ADDRESSES.MerchantPortal === ZERO_ADDRESS) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!isAddress(merchant) || merchant.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Merchant must be a valid non-zero address')
      }
      if (!maxAmount || Number(maxAmount) <= 0) {
        throw new Error('Maximum amount must be greater than zero')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'setMerchantPullPermit',
        args: [merchant, parseEther(maxAmount), BigInt(expiresAt)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { success: true, hash }
    } catch (err: unknown) {
      logError('setMerchantPullPermit', err);
      const parsed = parseContractError(err);
      const errorMsg = `Failed to set merchant pull permit: ${parsed.userMessage}`;
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  return {
    setMerchantPullPermit,
    isSetting: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error,
  }
}

/**
 * Pay merchant (customer-initiated)
 */
export function usePayMerchant() {
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const payMerchant = async (
    merchant: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    setError(null)
    try {
      if (CONTRACT_ADDRESSES.MerchantPortal === ZERO_ADDRESS) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!isAddress(merchant) || merchant.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Merchant must be a valid non-zero address')
      }
      if (!isAddress(token) || token.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Payment token must be a valid non-zero address')
      }
      if (!amount || Number(amount) <= 0) {
        throw new Error('Amount must be greater than zero')
      }
      if (!orderId.trim()) {
        throw new Error('Order ID is required')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'pay',
        args: [merchant, token, parseEther(amount), orderId.trim()],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { success: true, hash }
    } catch (err: unknown) {
      logError('payMerchant', err);
      const parsed = parseContractError(err);
      const errorMsg = `Failed to pay merchant: ${parsed.userMessage}`;
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }
  
  return {
    payMerchant,
    isPaying: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error,
  }
}

// Type matches MerchantPortal.sol getCustomerTrustScore return:
// (uint16 score, bool highTrust, bool lowTrust, bool eligible)
type CustomerTrustInfo = [bigint, boolean, boolean, boolean]

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
      enabled: !!customerAddress && CONTRACT_ADDRESSES.MerchantPortal !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const info = data as CustomerTrustInfo | undefined
  
  return {
    score: info?.[0] !== undefined ? safeBigIntToNumber(info[0], 0) : 5000,
    highTrust: info?.[1] ?? false,
    lowTrust: info?.[2] ?? false,
    eligible: info?.[3] ?? false,
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
