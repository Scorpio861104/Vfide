'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, useReadContracts, usePublicClient, useChainId } from 'wagmi'
import { parseEther, formatEther, type Abi } from 'viem'
import { useState, useEffect } from 'react'
import { CONTRACT_ADDRESSES, ACTIVE_VAULT_IMPLEMENTATION, ACTIVE_VAULT_ABI, isCardBoundVaultMode, isConfiguredContractAddress } from '../lib/contracts'
import { ZERO_ADDRESS } from '../lib/constants'
import { VaultHubABI, VFIDETokenABI } from '../lib/abis'
import { CURRENT_CHAIN_ID } from '../lib/testnet'
import { validateAddress } from '../lib/validation'
import { parseContractError, logError } from '@/lib/errorHandling';
import { useAppStore } from '@/lib/store/appStore';

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

// Use active vault ABI that matches deployed vault type (CardBoundVault or UserVault-style)
// CRITICAL: Must use ACTIVE_VAULT_ABI to match actually deployed contract
const VAULT_ABI = ACTIVE_VAULT_ABI
const LEGACY_VAULT_UNSUPPORTED_MESSAGE = 'This action is not supported in CardBound vault mode.'

export function useUserVault() {
  const { address } = useAccount()
  const hasVaultHubConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub)
  
  const { data: vaultAddress, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && hasVaultHubConfig,
    }
  })
  
  const hasVault = vaultAddress && vaultAddress !== ZERO_ADDRESS
  
  return {
    vaultAddress: hasVault ? (vaultAddress as `0x${string}`) : null,
    hasVault,
    isLoading,
    implementation: ACTIVE_VAULT_IMPLEMENTATION,
    isCardBound: ACTIVE_VAULT_IMPLEMENTATION === 'cardbound',
  }
}

export function useCreateVault() {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, data, isPending } = useWriteContract()
  const hasVaultHubConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub)
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  // VaultHub ensureVault() creates if doesn't exist, returns existing vault if it does
  const createVault = async () => {
    if (!address) return null
    if (!hasVaultHubConfig) {
      throw new Error('VaultHub is not configured in this environment')
    }
    if (chainId !== CURRENT_CHAIN_ID) {
      throw new Error('Switch to the configured network before creating a vault')
    }
    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESSES.VaultHub,
      abi: HUB_ABI,
      functionName: 'ensureVault',
      args: [address],
      chainId: CURRENT_CHAIN_ID,
    })
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash })
    }
    return hash
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
  const setVault = useAppStore((state) => state.setVault)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'
  const hasTokenConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken)
  
  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && hasTokenConfig,
      refetchInterval: 2000, // Refresh every 2 seconds
    }
  })

  // Fetch pending transaction count to compute locked balance
  const { data: pendingTxCount } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: VAULT_ABI,
    functionName: 'pendingTxCount',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
      refetchInterval: 5000,
    }
  })

  // Cap at MAX_PENDING_TX_READ to avoid creating an excessively large batch of
  // contract reads. UserVault enforces a practical limit of ~10 pending
  // transactions, but we guard against unexpectedly large values from stale/local data
  // or misconfigured contracts.
  const MAX_PENDING_TX_READ = 50
  const pendingCount = Math.min(Number((pendingTxCount as bigint) || 0n), MAX_PENDING_TX_READ)

  // Batch-read all pending transactions to sum their locked amounts
  const pendingContracts = Array.from({ length: pendingCount }, (_, i) => ({
    address: vaultAddress as `0x${string}`,
    abi: VAULT_ABI as Abi,
    functionName: 'pendingTransactions' as const,
    args: [BigInt(i)] as const,
  }))

  const { data: pendingTxData } = useReadContracts({
    contracts: pendingContracts,
    query: {
      enabled: !!vaultAddress && pendingCount > 0,
    }
  })

  // PendingTransaction tuple: [toVault, amount, requestTime, approved, executed]
  type PendingTxTuple = [string, bigint, bigint, boolean, boolean]

  // Sum amounts of pending transactions that are not yet executed
  const lockedBalanceRaw = (pendingTxData ?? []).reduce((sum, result) => {
    if (result.status !== 'success' || !result.result) return sum
    const tx = result.result as PendingTxTuple
    const executed = tx[4]
    if (!executed) {
      return sum + tx[1]
    }
    return sum
  }, 0n)

  const formattedBalance = balance ? formatEther(balance as bigint) : '0';
  const formattedLockedBalance = formatEther(lockedBalanceRaw);
  
  // Sync with Zustand store for global state access
  useEffect(() => {
    if (vaultAddress && balance !== undefined) {
      setVault({
        address: vaultAddress,
        balance: formattedBalance,
        lockedBalance: formattedLockedBalance,
        lastUpdated: Date.now(),
      });
    }
  }, [vaultAddress, balance, formattedBalance, formattedLockedBalance, setVault]);
  
  return {
    balance: formattedBalance,
    balanceRaw: (balance as bigint) || 0n,
    lockedBalance: formattedLockedBalance,
    lockedBalanceRaw,
    isLoading,
    refetch,
  }
}

export function useTransferVFIDE() {
  const chainId = useChainId()
  const { vaultAddress } = useUserVault()
  const { writeContract, data, isPending } = useWriteContract()
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const transfer = (toVault: `0x${string}`, amount: string) => {
    if (!vaultAddress) return
    if (!isLegacyMode) {
      throw new Error('Direct vault transfers are not available in CardBound vault mode. Use the card-bound transfer flow instead.')
    }
    
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
    
    if (chainId !== CURRENT_CHAIN_ID) {
      throw new Error('Switch to the configured network before transferring VFIDE')
    }

    // UserVault uses 'transferVFIDE' function (matches ABI)
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'transferVFIDE',
      args: [toVault, parseEther(amount)],
      chainId: CURRENT_CHAIN_ID,
    })
  }
  
  return {
    transfer,
    isTransferring: isPending || isConfirming,
    isSuccess,
    txHash: data,
    isSupported: isLegacyMode,
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
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { data: isMature } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'isGuardianMature',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: isLegacyMode && !!vaultAddress && !!guardianAddress,
    }
  })

  return {
    isMature: isLegacyMode ? (isMature || false) : false,
  }
}

/**
 * Add or remove guardian
 * UserVault uses address-based guardian management: setGuardian(address g, bool active)
 * @param guardianAddress Address of the guardian
 * @param active True to add, false to remove
 */
export function useSetGuardian(vaultAddress: `0x${string}`) {
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cardBoundMode = isCardBoundVaultMode()

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  // Fixed: setGuardian(address g, bool active) matches actual ABI
  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    setError(null)

    if (cardBoundMode) {
      setError(LEGACY_VAULT_UNSUPPORTED_MESSAGE)
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }
    
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
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { data: threshold } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'abnormalTransactionThreshold',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
    }
  })

  const { data: usePercentage } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'usePercentageThreshold',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
    }
  })

  const { data: percentageBps } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'abnormalTransactionPercentageBps',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const setSnapshotMode = async (useSnapshot: boolean) => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'setBalanceSnapshotMode',
        args: [useSnapshot],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const updateSnapshot = async () => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'updateBalanceSnapshot',
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { data: useSnapshot } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'useBalanceSnapshot',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
    }
  })

  const { data: snapshot } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'balanceSnapshot',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
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
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { data: pendingTx } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'pendingTransactions',
    args: txId !== undefined ? [BigInt(txId)] : undefined,
    query: {
      enabled: isLegacyMode && !!vaultAddress && txId !== undefined,
    }
  })

  const { data: pendingTxCount } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'pendingTxCount',
    query: {
      enabled: isLegacyMode && !!vaultAddress,
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const approve = async (txId: number) => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'approvePendingTransaction',
        args: [BigInt(txId)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const execute = async (txId: number) => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'executePendingTransaction',
        args: [BigInt(txId)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cleanup = async (txId: number) => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'cleanupExpiredTransaction',
        args: [BigInt(txId)],
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isLegacyMode = ACTIVE_VAULT_IMPLEMENTATION === 'uservault'

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cancelInheritance = async () => {
    if (!isLegacyMode) {
      return { success: false, error: LEGACY_VAULT_UNSUPPORTED_MESSAGE }
    }

    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'guardianCancelInheritance',
      })
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
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
  const cardBoundMode = isCardBoundVaultMode()

  const { data: nextOfKin } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'nextOfKin',
    query: {
      enabled: !cardBoundMode && !!vaultAddress,
    }
  })

  const resolvedNextOfKin = cardBoundMode
    ? ZERO_ADDRESS
    : ((nextOfKin as `0x${string}` | undefined) ?? ZERO_ADDRESS)
  const hasNextOfKin = !cardBoundMode && !!vaultAddress && resolvedNextOfKin !== ZERO_ADDRESS

  return {
    nextOfKin: resolvedNextOfKin,
    hasNextOfKin,
  }
}
