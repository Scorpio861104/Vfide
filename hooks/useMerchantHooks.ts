'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, usePublicClient, useChainId, useSignTypedData } from 'wagmi'
import { parseEther, formatEther, isAddress } from 'viem'
import { useState } from 'react'
import { ZERO_ADDRESS, isConfiguredContractAddress } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { CURRENT_CHAIN_ID } from '../lib/testnet'
import { MerchantPortalABI, VaultHubABI, CardBoundVaultABI } from '../lib/abis'
import { parseContractError, logError } from '@/lib/errorHandling';
import { safeBigIntToNumber } from '@/lib/validation';

// ============================================
// MERCHANT HOOKS - No processor fees (burn + gas apply)
// ============================================

// Type matches MerchantPortal.sol getMerchantInfo return:
// (bool registered, bool suspended, string businessName, string category, uint64 registeredAt, uint256 totalVolume, uint256 txCount)
type MerchantInfo = [boolean, boolean, string, string, bigint, bigint, bigint]

const MerchantPortalIntentABI = [
  {
    type: 'function',
    name: 'payWithIntent',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'merchantPortal', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'merchant', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'walletEpoch', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
          { name: 'chainId', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
      { name: 'orderId', type: 'string' },
    ],
    outputs: [{ name: 'netAmount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'merchants',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'suspended', type: 'bool' },
      { name: 'businessName', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'registeredAt', type: 'uint64' },
      { name: 'totalVolume', type: 'uint256' },
      { name: 'txCount', type: 'uint256' },
      { name: 'payoutAddress', type: 'address' },
    ],
  },
] as const

export function useIsMerchant(address?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const { data: merchantInfo, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getMerchantInfo',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && isAvailable,
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
    isAvailable,
  }
}

export function useRegisterMerchant() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const registerMerchant = async (businessName: string, category: string) => {
    setError(null)
    try {
      if (!isAvailable) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!businessName.trim() || !category.trim()) {
        throw new Error('Business name and category are required')
      }
      if (chainId !== CURRENT_CHAIN_ID) {
        throw new Error('Switch to the configured network before registering a merchant')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'registerMerchant',
        args: [businessName.trim(), category.trim()],
        chainId: CURRENT_CHAIN_ID,
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
    isAvailable,
  }
}

/**
 * Process payment from customer to merchant (merchant-initiated)
 */
export function useProcessPayment() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const processPayment = async (
    customer: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    setError(null)
    try {
      if (!isAvailable) {
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
      if (chainId !== CURRENT_CHAIN_ID) {
        throw new Error('Switch to the configured network before processing payments')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'processPayment',
        args: [customer, token, parseEther(amount), orderId.trim()],
        chainId: CURRENT_CHAIN_ID,
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
    isAvailable,
  }
}

/**
 * Set a scoped merchant pull permit for merchant-initiated payments.
 */
export function useSetMerchantPullPermit() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)

  const setMerchantPullPermit = async (
    merchant: `0x${string}`,
    maxAmount: string,
    expiresAt: bigint | number = 0
  ) => {
    setError(null)
    try {
      if (!isAvailable) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!isAddress(merchant) || merchant.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Merchant must be a valid non-zero address')
      }
      if (!maxAmount || Number(maxAmount) <= 0) {
        throw new Error('Maximum amount must be greater than zero')
      }
      if (chainId !== CURRENT_CHAIN_ID) {
        throw new Error('Switch to the configured network before setting merchant pull permits')
      }
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalABI,
        functionName: 'setMerchantPullPermit',
        args: [merchant, parseEther(maxAmount), BigInt(expiresAt)],
        chainId: CURRENT_CHAIN_ID,
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
    isAvailable,
  }
}

/**
 * Pay merchant (customer-initiated)
 */
export function usePayMerchant() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const payMerchant = async (
    merchant: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    setError(null)
    try {
      if (!isAvailable) {
        throw new Error('MerchantPortal is not configured in this environment')
      }
      if (!address) {
        throw new Error('Wallet not connected')
      }
      if (!isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub)) {
        throw new Error('VaultHub is not configured in this environment')
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
      if (chainId !== CURRENT_CHAIN_ID) {
        throw new Error('Switch to the configured network before paying merchants')
      }

      if (!publicClient) {
        throw new Error('Wallet client not available')
      }

      const customerVault = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.VaultHub,
        abi: VaultHubABI,
        functionName: 'vaultOf',
        args: [address],
      }) as `0x${string}`

      if (!isAddress(customerVault) || customerVault.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('No customer vault found. Please initialize your vault first.')
      }

      const merchantInfo = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalIntentABI,
        functionName: 'merchants',
        args: [merchant],
      }) as readonly [boolean, boolean, string, string, bigint, bigint, bigint, `0x${string}`]

      const payoutAddress = merchantInfo[7]
      const merchantVault = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.VaultHub,
        abi: VaultHubABI,
        functionName: 'vaultOf',
        args: [merchant],
      }) as `0x${string}`

      const recipient = payoutAddress && payoutAddress.toLowerCase() !== ZERO_ADDRESS
        ? payoutAddress
        : merchantVault

      if (!isAddress(recipient) || recipient.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Merchant recipient vault is not initialized yet. Ask merchant to initialize vault or set payout address.')
      }

      const nonce = await publicClient.readContract({
        address: customerVault,
        abi: CardBoundVaultABI,
        functionName: 'nextNonce',
      }) as bigint

      const walletEpoch = await publicClient.readContract({
        address: customerVault,
        abi: CardBoundVaultABI,
        functionName: 'walletEpoch',
      }) as bigint

      const amountWei = parseEther(amount)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
      const intent = {
        vault: customerVault,
        merchantPortal: CONTRACT_ADDRESSES.MerchantPortal,
        token,
        merchant,
        recipient,
        amount: amountWei,
        nonce,
        walletEpoch,
        deadline,
        chainId: BigInt(CURRENT_CHAIN_ID),
      }

      const signature = await signTypedDataAsync({
        domain: {
          name: 'CardBoundVault',
          version: '1',
          chainId: CURRENT_CHAIN_ID,
          verifyingContract: customerVault,
        },
        types: {
          PayIntent: [
            { name: 'vault', type: 'address' },
            { name: 'merchantPortal', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'merchant', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'walletEpoch', type: 'uint64' },
            { name: 'deadline', type: 'uint64' },
            { name: 'chainId', type: 'uint256' },
          ],
        },
        primaryType: 'PayIntent',
        message: intent,
      })

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MerchantPortal,
        abi: MerchantPortalIntentABI,
        functionName: 'payWithIntent',
        args: [intent, signature, orderId.trim()],
        chainId: CURRENT_CHAIN_ID,
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
    isAvailable,
  }
}

// Type matches MerchantPortal.sol getCustomerTrustScore return:
// (uint16 score, bool highTrust, bool lowTrust, bool eligible)
type CustomerTrustInfo = [bigint, boolean, boolean, boolean]

/**
 * Get customer trust assessment for merchants
 */
export function useCustomerTrustScore(customerAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getCustomerTrustScore',
    args: customerAddress ? [customerAddress] : undefined,
    query: {
      enabled: !!customerAddress && isAvailable,
    }
  })
  
  const info = data as CustomerTrustInfo | undefined
  
  return {
    score: info?.[0] !== undefined ? safeBigIntToNumber(info[0], 0) : 5000,
    highTrust: info?.[1] ?? false,
    lowTrust: info?.[2] ?? false,
    eligible: info?.[3] ?? false,
    isLoading,
    isAvailable,
  }
}

/**
 * Enable/disable auto-conversion to stablecoins (STABLE-PAY)
 */
export function useSetAutoConvert() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { writeContract, data, isPending } = useWriteContract()
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setAutoConvert = (enabled: boolean) => {
    if (!isAvailable) return
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
    isAvailable,
  }
}

/**
 * Set custom payout address for merchant
 */
export function useSetPayoutAddress() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { writeContract, data, isPending } = useWriteContract()
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setPayoutAddress = (payoutAddress: `0x${string}`) => {
    if (!isAvailable) return
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
    isAvailable,
  }
}
