'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState } from 'react'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { ZERO_ADDRESS } from '../lib/constants'
import { VaultHubABI, VFIDETokenABI, UserVaultABI, VaultInfrastructureABI } from '../lib/abis'
import { validateAddress } from '../lib/validation'
import { parseContractError, logError } from '@/lib/errorHandling';

// ============================================
// VAULT HOOKS - Non-custodial vault management
// 
// Uses full VaultInfrastructure (VaultHubABI) for all vault features including:
// - Guardian management with maturity periods
// - Next of Kin (inheritance) functionality  
// - Recovery mechanisms
// - Balance snapshots and pending transactions
// ============================================

// Use VaultHub (VaultInfrastructure) ABI for hub operations
const HUB_ABI = VaultHubABI

// Use UserVault ABI for individual vault operations
const VAULT_ABI = UserVaultABI

export function useUserVault() {
  const { address } = useAccount()
  
  const { data: vaultAddress, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })
  
  const hasVault = vaultAddress && vaultAddress !== ZERO_ADDRESS
  
  return {
    vaultAddress: hasVault ? (vaultAddress as `0x${string}`) : null,
    hasVault,
    isLoading,
  }
}

export function useCreateVault() {
  const { address } = useAccount()
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  // VaultHub createVault() with no args
  const createVault = () => {
    if (!address) return
    writeContract({
      address: CONTRACT_ADDRESSES.VaultHub,
      abi: HUB_ABI,
      functionName: 'createVault',
      args: [],
    })
  }
  
  return {
    createVault,
    isCreating: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

export function useVaultBalance() {
  const { vaultAddress } = useUserVault()
  
  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 2000, // Refresh every 2 seconds
    }
  })
  
  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    balanceRaw: (balance as bigint) || 0n,
    isLoading,
    refetch,
  }
}

export function useTransferVFIDE() {
  const { vaultAddress } = useUserVault()
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const transfer = (toVault: `0x${string}`, amount: string) => {
    if (!vaultAddress) return
    
    // Validate recipient address
    const validation = validateAddress(toVault)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid recipient vault address')
    }
    
    // UserVault uses 'transfer' function
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'transfer',
      args: [toVault, parseEther(amount)],
    })
  }
  
  return {
    transfer,
    isTransferring: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

// ============================================================================
// VAULT MANAGEMENT HOOKS (VaultInfrastructure.sol enhancements)
// ============================================================================

/**
 * Get vault's guardian info with maturity status
 */
export function useVaultGuardiansDetailed(vaultAddress?: `0x${string}`) {
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'guardianCount',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    guardianCount: guardianCount || 0,
  }
}

/**
 * Check if guardian is mature (past 7-day maturity period)
 */
export function useIsGuardianMature(vaultAddress?: `0x${string}`, guardianAddress?: `0x${string}`) {
  const { data: isMature } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'isGuardianMature',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress,
    }
  })

  return {
    isMature: isMature || false,
  }
}

/**
 * Add or remove guardian (UserVault uses slot-based guardians)
 * @param slot Guardian slot (0-2)
 * @param guardian Address to set (use zero address to clear)
 */
export function useSetGuardian(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  // C-4 Fix: Updated signature to match UserVault: setGuardian(uint8 slot, address guardian)
  const setGuardian = async (slot: number, guardianAddress: `0x${string}`) => {
    setError(null)
    
    // Validate guardian address
    const addressValidation = validateAddress(guardianAddress)
    if (!addressValidation.valid) {
      setError(addressValidation.error || 'Invalid guardian address')
      return { success: false, error: addressValidation.error }
    }
    
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'setGuardian',
        args: [slot, guardianAddress],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('setGuardian', err);
      const parsed = parseContractError(err);
      setError(parsed.userMessage);
      return { success: false, error: parsed.userMessage }
    }
  }

  // Convenience wrapper for legacy code that uses (address, bool) signature
  const setGuardianLegacy = async (guardianAddress: `0x${string}`, active: boolean) => {
    // Find first empty slot if adding, or find the guardian's slot if removing
    // For simplicity, use slot 0 for add, clear by setting to zero address
    const slot = 0
    const addr = active ? guardianAddress : ZERO_ADDRESS
    return setGuardian(slot, addr)
  }

  return {
    setGuardian,
    setGuardianLegacy,
    txHash,
    isSuccess,
    isLoading,
    error,
  }
}

/**
 * Get abnormal transaction threshold (dynamic based on settings)
 */
export function useAbnormalTransactionThreshold(vaultAddress?: `0x${string}`) {
  const { data: threshold } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getAbnormalTransactionThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: usePercentage } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'usePercentageThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: percentageBps } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'abnormalTransactionPercentageBps',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    threshold: (threshold as bigint) || 0n,
    usePercentage: usePercentage || false,
    percentageBps: percentageBps ? Number(percentageBps) : 0,
  }
}

/**
 * Set balance snapshot mode for abnormal transaction detection
 */
export function useSetBalanceSnapshotMode(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const setSnapshotMode = async (useSnapshot: boolean) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'setBalanceSnapshotMode',
        args: [useSnapshot],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('setSnapshotMode', err);
      const parsed = parseContractError(err);
      return { success: false, error: parsed.userMessage }
    }
  }

  return {
    setSnapshotMode,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Update balance snapshot
 */
export function useUpdateBalanceSnapshot(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const updateSnapshot = async () => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'updateBalanceSnapshot',
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('updateSnapshot', err);
      const parsed = parseContractError(err);
      return { success: false, error: parsed.userMessage }
    }
  }

  return {
    updateSnapshot,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Get balance snapshot info
 */
export function useBalanceSnapshot(vaultAddress?: `0x${string}`) {
  const { data: useSnapshot } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'useBalanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: snapshot } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'balanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    useSnapshot: useSnapshot || false,
    snapshot: (snapshot as bigint) || 0n,
  }
}

/**
 * Get pending transaction details
 */
export function usePendingTransaction(vaultAddress?: `0x${string}`, txId?: number) {
  const { data: pendingTx } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'pendingTransactions',
    args: txId !== undefined ? [BigInt(txId)] : undefined,
    query: {
      enabled: !!vaultAddress && txId !== undefined,
    }
  })

  const { data: pendingTxCount } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'pendingTxCount',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const tx = pendingTx as [string, bigint, bigint, boolean, boolean] | undefined

  return {
    pendingTx: tx ? {
      toVault: tx[0],
      amount: tx[1],
      requestTime: tx[2],
      approved: tx[3],
      executed: tx[4],
    } : null,
    pendingTxCount: (pendingTxCount as bigint) || 0n,
  }
}

/**
 * Approve pending abnormal transaction
 */
export function useApprovePendingTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const approve = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'approvePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('approvePendingTransaction', err);
      const parsed = parseContractError(err);
      return { success: false, error: parsed.userMessage }
    }
  }

  return {
    approve,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Execute approved pending transaction
 */
export function useExecutePendingTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const execute = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'executePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('executePendingTransaction', err);
      const parsed = parseContractError(err);
      return { success: false, error: parsed.userMessage }
    }
  }

  return {
    execute,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Cleanup expired pending transaction
 */
export function useCleanupExpiredTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cleanup = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'cleanupExpiredTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      logError('cleanupExpiredTransaction', err);
      const parsed = parseContractError(err);
      return { success: false, error: parsed.userMessage }
    }
  }

  return {
    cleanup,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Guardian votes to cancel fraudulent inheritance request
 */
export function useGuardianCancelInheritance(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cancelInheritance = async () => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'guardianCancelInheritance',
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    cancelInheritance,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Get inheritance request status with cancellation tracking
 */
export function useInheritanceStatus(vaultAddress?: `0x${string}`) {
  const { data: nextOfKin } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'nextOfKin',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    nextOfKin: (nextOfKin as `0x${string}`) || ZERO_ADDRESS,
    hasNextOfKin: nextOfKin !== ZERO_ADDRESS,
  }
}
