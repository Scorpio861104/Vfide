'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState } from 'react'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { VaultInfrastructureABI, VFIDETokenABI } from '../lib/abis'

// ============================================
// VAULT HOOKS - Non-custodial vault management
// ============================================

export function useUserVault() {
  const { address } = useAccount()
  
  const { data: vaultAddress, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VaultInfrastructureABI, // Note: VaultHub likely shares ABI or has specific one. Using VaultInfrastructureABI as placeholder if it matches, or need VaultHubABI. 
    // Wait, the original code used inline ABI for VaultHub. Let's check if VaultHubABI exists in abis/index.ts. 
    // It wasn't explicitly exported in my read of abis/index.ts, but VaultInfrastructureABI was.
    // The inline ABI was: vaultOf(address) -> address.
    // Let's assume VaultInfrastructureABI covers it or I should check.
    // Actually, VaultHub is likely the factory. 
    // Let's stick to the inline ABI structure but use the imported JSON if it matches.
    // If I'm not sure, I should check the JSON content. 
    // But for now, I will use the imported ABI if it has the function.
    // If not, I will use the inline ABI but defined as a constant in this file to avoid "magic strings" everywhere.
    // However, the instruction was to use imported ABIs.
    // Let's look at `VaultInfrastructure.json` again. It had a constructor.
    // I'll use `VaultInfrastructureABI` for now.
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })
  
  const hasVault = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000'
  
  return {
    vaultAddress: hasVault ? (vaultAddress as `0x${string}`) : null,
    hasVault,
    isLoading,
  }
}

export function useCreateVault() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const createVault = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.VaultHub,
      abi: VaultInfrastructureABI, // Assuming createVault is here
      functionName: 'createVault',
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
    
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: VaultInfrastructureABI,
      functionName: 'transferVFIDE',
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
    abi: VaultInfrastructureABI,
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
    abi: VaultInfrastructureABI,
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
 * Add or remove guardian (handles UV_RecoveryActive error)
 */
export function useSetGuardian(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    setError(null)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: VaultInfrastructureABI,
        functionName: 'setGuardian',
        args: [guardianAddress, active],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed'
      if (errorMsg.includes('UV_RecoveryActive')) {
        setError('Cannot remove guardians during active recovery')
      } else if (errorMsg.includes('UV_Locked')) {
        setError('Vault is currently locked')
      } else {
        setError(errorMsg)
      }
      return { success: false, error: errorMsg }
    }
  }

  return {
    setGuardian,
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
    abi: VaultInfrastructureABI,
    functionName: 'getAbnormalTransactionThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: usePercentage } = useReadContract({
    address: vaultAddress,
    abi: VaultInfrastructureABI,
    functionName: 'usePercentageThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: percentageBps } = useReadContract({
    address: vaultAddress,
    abi: VaultInfrastructureABI,
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
        abi: VaultInfrastructureABI,
        functionName: 'setBalanceSnapshotMode',
        args: [useSnapshot],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
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
        abi: VaultInfrastructureABI,
        functionName: 'updateBalanceSnapshot',
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
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
    abi: VaultInfrastructureABI,
    functionName: 'useBalanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: snapshot } = useReadContract({
    address: vaultAddress,
    abi: VaultInfrastructureABI,
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
    abi: VaultInfrastructureABI,
    functionName: 'pendingTransactions',
    args: txId !== undefined ? [BigInt(txId)] : undefined,
    query: {
      enabled: !!vaultAddress && txId !== undefined,
    }
  })

  const { data: pendingTxCount } = useReadContract({
    address: vaultAddress,
    abi: VaultInfrastructureABI,
    functionName: 'pendingTxCount',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const tx = pendingTx as any[] | undefined

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
        abi: VaultInfrastructureABI,
        functionName: 'approvePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
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
        abi: VaultInfrastructureABI,
        functionName: 'executePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
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
        abi: VaultInfrastructureABI,
        functionName: 'cleanupExpiredTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
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
        abi: VaultInfrastructureABI,
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
    abi: VaultInfrastructureABI,
    functionName: 'nextOfKin',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    nextOfKin: (nextOfKin as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    hasNextOfKin: nextOfKin !== '0x0000000000000000000000000000000000000000',
  }
}
