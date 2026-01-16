'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState } from 'react'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { ZERO_ADDRESS } from '../lib/constants'
import { VaultHubABI, VFIDETokenABI, UserVaultABI } from '../lib/abis'
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
  
  const { data: vaultAddress, isLoading, isError, error, refetch } = useReadContract({
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
    isError,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}

export function useCreateVault() {
  const { address } = useAccount()
  const { writeContract, data, isPending, error: writeError } = useWriteContract()
  
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
    error: writeError ? parseContractError(writeError).userMessage : null,
    isError: !!writeError,
  }
}

export function useVaultBalance() {
  const { vaultAddress } = useUserVault()
  
  const { data: balance, isLoading, isError, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 5000, // Refresh every 5 seconds (balance changes are not instant)
      staleTime: 3000, // Consider fresh for 3s
    }
  })
  
  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    balanceRaw: (balance as bigint) || 0n,
    isLoading,
    isError,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}

export function useTransferVFIDE() {
  const { vaultAddress } = useUserVault()
  const { writeContract, data, isPending, error: writeError } = useWriteContract()
  
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
    
    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Amount must be a positive number')
    }
    
    // UserVault uses 'transferVFIDE' function (matches ABI)
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'transferVFIDE',
      args: [toVault, parseEther(amount)],
    })
  }
  
  return {
    transfer,
    isTransferring: isPending || isConfirming,
    isSuccess,
    txHash: data,
    error: writeError ? parseContractError(writeError).userMessage : null,
    isError: !!writeError,
  }
}

// ============================================================================
// VAULT MANAGEMENT HOOKS (VaultInfrastructure.sol enhancements)
// ============================================================================

/**
 * Get vault's guardian info with maturity status
 */
export function useVaultGuardiansDetailed(vaultAddress?: `0x${string}`) {
  const { data: guardianCount, isLoading, isError, error, refetch } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'guardianCount',
    query: {
      enabled: !!vaultAddress,
      staleTime: 30_000, // Cache for 30s to reduce RPC calls
    }
  })

  return {
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    isLoading,
    isError,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}

/**
 * Check if guardian is mature (past 7-day maturity period)
 */
export function useIsGuardianMature(vaultAddress?: `0x${string}`, guardianAddress?: `0x${string}`) {
  const { data: isMature, isLoading, isError, error, refetch } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'isGuardianMature',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress,
      staleTime: 60_000, // Guardian maturity doesn't change often
    }
  })

  return {
    isMature: isMature || false,
    isLoading,
    isError,
    error: error ? parseContractError(error).userMessage : null,
    refetch,
  }
}

/**
 * Add or remove guardian
 * UserVault uses address-based guardian management: setGuardian(address g, bool active)
 * @param guardianAddress Address of the guardian
 * @param active True to add, false to remove
 */
export function useSetGuardian(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  // Fixed: setGuardian(address g, bool active) matches actual ABI
  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    setError(null)
    
    // Validate guardian address (don't allow zero address for adding)
    const addressValidation = validateAddress(guardianAddress, { allowZeroAddress: !active })
    if (!addressValidation.valid) {
      setError(addressValidation.error || 'Invalid guardian address')
      return { success: false, error: addressValidation.error }
    }
    
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'setGuardian',
        args: [guardianAddress, active],
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

  // Convenience wrappers for add/remove
  const addGuardian = async (guardianAddress: `0x${string}`) => {
    return setGuardian(guardianAddress, true)
  }

  const removeGuardian = async (guardianAddress: `0x${string}`) => {
    return setGuardian(guardianAddress, false)
  }

  return {
    setGuardian,
    addGuardian,
    removeGuardian,
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
  const { data: threshold, isError: thresholdError, error: tError } = useReadContract({
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
    isError: thresholdError,
    error: tError ? parseContractError(tError).userMessage : null,
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
  const { data: useSnapshot, isError: snapshotModeError } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'useBalanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: snapshot, isError: snapshotError, error } = useReadContract({
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
    isError: snapshotModeError || snapshotError,
    error: error ? parseContractError(error).userMessage : null,
  }
}

/**
 * Get pending transaction details
 */
export function usePendingTransaction(vaultAddress?: `0x${string}`, txId?: number) {
  const { data: pendingTx, isError: txError, error: pError } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'pendingTransactions',
    args: txId !== undefined ? [BigInt(txId)] : undefined,
    query: {
      enabled: !!vaultAddress && txId !== undefined,
    }
  })

  const { data: pendingTxCount, isError: countError, error: cError } = useReadContract({
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
    isError: txError || countError,
    error: (pError || cError) ? parseContractError(pError || cError).userMessage : null,
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
  const { data: nextOfKin, isLoading, isError, error } = useReadContract({
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
    isLoading,
    isError,
    error: error ? parseContractError(error).userMessage : null,
  }
}
