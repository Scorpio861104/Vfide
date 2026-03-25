'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { 
import { logger } from '@/lib/logger';
  SecurityHubABI, 
  PanicGuardABI, 
  GuardianRegistryABI, 
  GuardianLockABI, 
  EmergencyBreakerABI,
  VaultHubABI 
} from '../lib/abis'

// ============================================
// SECURITY SYSTEM HOOKS - VFIDESecurity.sol
// ============================================

/**
 * Check if a vault is locked by any security layer
 * Priority: EmergencyBreaker > GuardianLock > PanicGuard > GlobalRisk
 */
export function useIsVaultLocked(vaultAddress?: `0x${string}`) {
  const { data: isLocked, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SecurityHub,
    abi: SecurityHubABI,
    functionName: 'isLocked',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.SecurityHub !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  return {
    isLocked: isLocked || false,
    isLoading,
    refetch,
  }
}

/**
 * Get quarantine status and expiry time for a vault
 */
export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
  const { data: quarantineUntil, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'quarantineUntil',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.PanicGuard !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const until = quarantineUntil ? Number(quarantineUntil) : 0
  // Return raw timestamp - component should calculate isQuarantined using useEffect with current time
  
  return {
    quarantineUntil: until,
    // Components should calculate these using: until > Date.now() / 1000
    isLoading,
  }
}

/**
 * Check if user can self-panic (not in cooldown, vault old enough)
 */
export function useCanSelfPanic() {
  const { address } = useAccount()
  // Note: Circular dependency if we use useUserVault here? 
  // useUserVault is in useVaultHooks.ts. 
  // To avoid circular deps, we should probably pass vaultAddress as arg or duplicate logic.
  // But useUserVault is simple. Let's assume we can import it or just use the logic.
  // For now, I'll just use the logic directly to be safe.
  
  const { data: vaultAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VaultHubABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })
  
  const { data: lastPanic, isLoading: isLoadingLastPanic } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'lastSelfPanic',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACT_ADDRESSES.PanicGuard !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const { data: vaultCreationTime, isLoading: isLoadingCreationTime } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'vaultCreationTime',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.PanicGuard !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const lastPanicTime = lastPanic ? Number(lastPanic) : 0
  const creationTime = vaultCreationTime ? Number(vaultCreationTime) : 0
  
  const COOLDOWN = 24 * 3600 // 24 hours
  const MIN_AGE = 3600 // 1 hour
  
  // Return raw timestamps for component to compute time-sensitive values
  return {
    lastPanicTime,
    creationTime,
    cooldownSeconds: COOLDOWN,
    minAgeSeconds: MIN_AGE,
    isLoading: isLoadingLastPanic || isLoadingCreationTime,
  }
}

/**
 * Self-panic: Lock your own vault immediately
 * NOTE: Returns isAvailable=false if PanicGuard is not deployed
 */
export function useSelfPanic() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  // Check if PanicGuard is deployed
  const isAvailable = CONTRACT_ADDRESSES.PanicGuard !== '0x0000000000000000000000000000000000000000' && CONTRACT_ADDRESSES.PanicGuard !== '0x' && CONTRACT_ADDRESSES.PanicGuard.length === 42
  
  const selfPanic = (durationHours: number = 24) => {
    if (!isAvailable) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('PanicGuard contract not deployed - selfPanic unavailable')
      }
      return
    }
    const durationSeconds = durationHours * 3600
    writeContract({
      address: CONTRACT_ADDRESSES.PanicGuard,
      abi: PanicGuardABI,
      functionName: 'selfPanic',
      args: [BigInt(durationSeconds)],
    })
  }
  
  return {
    selfPanic,
    isPanicking: isPending || isConfirming,
    isSuccess,
    txHash: data,
    isAvailable, // New: indicates if the feature is available
  }
}

/**
 * Get vault guardians list and threshold
 */
export function useVaultGuardians(vaultAddress?: `0x${string}`) {
  const { data: guardianCount } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: GuardianRegistryABI,
    functionName: 'guardianCount',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.GuardianRegistry !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const { data: threshold } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: GuardianRegistryABI,
    functionName: 'guardiansNeeded',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.GuardianRegistry !== '0x0000000000000000000000000000000000000000',
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
  const { data: isGuardian } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: GuardianRegistryABI,
    functionName: 'isGuardian',
    args: vaultAddress && guardianAddress ? [vaultAddress, guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress && CONTRACT_ADDRESSES.GuardianRegistry !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  return isGuardian || false
}

/**
 * Get guardian lock status and approval count
 */
export function useGuardianLockStatus(vaultAddress?: `0x${string}`) {
  const { data: locked } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: GuardianLockABI,
    functionName: 'locked',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.GuardianLock !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const { data: approvals } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: GuardianLockABI,
    functionName: 'approvals',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && CONTRACT_ADDRESSES.GuardianLock !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  return {
    isLocked: locked || false,
    approvals: approvals ? Number(approvals) : 0,
  }
}

/**
 * Cast guardian lock vote
 */
export function useCastGuardianLock(vaultAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const castLock = (reason: string = 'Security concern') => {
    writeContract({
      address: CONTRACT_ADDRESSES.GuardianLock,
      abi: GuardianLockABI,
      functionName: 'castLock',
      args: [vaultAddress, reason],
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
  const { data: halted, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.EmergencyBreaker,
    abi: EmergencyBreakerABI,
    functionName: 'halted',
    query: {
      enabled: CONTRACT_ADDRESSES.EmergencyBreaker !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000, // Check every 10 seconds
    }
  })
  
  const { data: globalRisk } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'globalRisk',
    query: {
      enabled: CONTRACT_ADDRESSES.PanicGuard !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000,
    }
  })
  
  return {
    isHalted: halted || false,
    isGlobalRisk: globalRisk || false,
    isEmergency: halted || globalRisk || false,
    refetch,
  }
}
