'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_VAULT_ABI, CARD_BOUND_VAULT_ABI, VAULT_HUB_ABI } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { logger } from '@/lib/logger';

// ============================================
// SECURITY SYSTEM HOOKS - VFIDESecurity.sol
// SecurityHub removed — non-custodial, no third-party locks
// ============================================

/**
 * Check if a vault is locked by any security layer
 * SecurityHub removed — always returns false (non-custodial)
 */
export function useIsVaultLocked(_vaultAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  return {
    isLocked: false,
    isLoading: false,
    refetch: () => Promise.resolve({ data: false }),
  }
}

/**
 * Get quarantine status and expiry time for a vault
 */
export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { data: paused, isLoading: isLoadingPaused } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: {
      enabled: !!vaultAddress,
    }
  })
  
  return {
    quarantineUntil: 0,
    isQuarantined: !!paused,
    supportsTimer: false,
    isLoading: isLoadingPaused,
  }
}

/**
 * Check if user can self-panic (not in cooldown, vault old enough)
 */
export function useCanSelfPanic() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address } = useAccount()
  
  const { data: vaultAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })
  const resolvedVaultAddress = vaultAddress as `0x${string}` | undefined

  const { data: paused, isLoading: isLoadingPaused } = useReadContract({
    address: resolvedVaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: { enabled: !!resolvedVaultAddress },
  })
  
  return {
    vaultAddress: resolvedVaultAddress,
    lastPanicTime: 0,
    creationTime: 0,
    cooldownSeconds: 0,
    minAgeSeconds: 0,
    isPaused: !!paused,
    isLoading: isLoadingPaused,
  }
}

/**
 * Self-panic: Lock your own vault immediately
 * NOTE: Returns isAvailable=false if PanicGuard is not deployed
 */
export function useSelfPanic() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address } = useAccount()
  const { writeContract, data, isPending } = useWriteContract()

  const { data: vaultAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const resolvedVaultAddress = vaultAddress as `0x${string}` | undefined

  const { data: paused } = useReadContract({
    address: resolvedVaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: { enabled: !!resolvedVaultAddress },
  })
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const isAvailable = !!resolvedVaultAddress && !paused
  
  const selfPanic = (durationHours: number = 24) => {
    if (!isAvailable) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Vault is unavailable or already paused - selfPanic unavailable')
      }
      return
    }

    if (resolvedVaultAddress) {
      writeContract({
        address: resolvedVaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'pause',
      })
      return
    }
  }
  
  return {
    selfPanic,
    isPanicking: isPending || isConfirming,
    isSuccess,
    txHash: data,
    isAvailable,
    supportsDuration: false,
  }
}

/**
 * Get vault guardians list and threshold
 */
export function useVaultGuardians(vaultAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    query: {
      enabled: !!vaultAddress,
    }
  })
  
  const { data: threshold } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })
  
  return {
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    threshold: threshold ? Number(threshold) : 0,
  }
}

/**
 * Check if address is guardian for vault
 */
export function useIsGuardian(vaultAddress?: `0x${string}`, guardianAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { data: isGuardian } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress,
    }
  })
  
  return isGuardian || false
}

/**
 * Get guardian lock status and approval count
 */
export function useGuardianLockStatus(vaultAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { data: paused } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: {
      enabled: !!vaultAddress,
    }
  })
  
  return {
    isLocked: !!paused,
    approvals: 0,
  }
}

/**
 * Cast guardian lock vote
 */
export function useCastGuardianLock(vaultAddress: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const castLock = (reason: string = 'Security concern') => {
    void reason
    writeContract({
      address: vaultAddress,
      abi: ACTIVE_VAULT_ABI,
      functionName: 'pause',
    })
  }
  
  return {
    castLock,
    isCasting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Check global emergency breaker status
 */
export function useEmergencyStatus() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  return {
    isHalted: false,
    isGlobalRisk: false,
    isEmergency: false,
    refetch: () => Promise.resolve(),
  }
}
