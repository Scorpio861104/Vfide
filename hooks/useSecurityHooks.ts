'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_VAULT_ABI, CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, VAULT_HUB_ABI, isCardBoundVaultMode, isConfiguredContractAddress } from '../lib/contracts'
import { 
  PanicGuardABI, 
  GuardianRegistryABI, 
  GuardianLockABI, 
  EmergencyBreakerABI,
} from '../lib/abis'
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
  const cardBoundMode = isCardBoundVaultMode()

  const { data: paused, isLoading: isLoadingPaused } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: {
      enabled: cardBoundMode && !!vaultAddress,
    }
  })

  const { data: quarantineUntil, isLoading: isLoadingQuarantine } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'quarantineUntil',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !cardBoundMode && !!vaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.PanicGuard),
    }
  })
  
  const until = cardBoundMode ? 0 : quarantineUntil ? Number(quarantineUntil) : 0
  
  return {
    quarantineUntil: until,
    isQuarantined: cardBoundMode ? !!paused : until > Math.floor(Date.now() / 1000),
    supportsTimer: !cardBoundMode,
    isLoading: cardBoundMode ? isLoadingPaused : isLoadingQuarantine,
  }
}

/**
 * Check if user can self-panic (not in cooldown, vault old enough)
 */
export function useCanSelfPanic() {
  const { address } = useAccount()
  const cardBoundMode = isCardBoundVaultMode()
  
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
    query: { enabled: cardBoundMode && !!resolvedVaultAddress },
  })
  
  const { data: lastPanic, isLoading: isLoadingLastPanic } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'lastSelfPanic',
    args: address ? [address] : undefined,
    query: {
      enabled: !cardBoundMode && !!address && isConfiguredContractAddress(CONTRACT_ADDRESSES.PanicGuard),
    }
  })
  
  const { data: vaultCreationTime, isLoading: isLoadingCreationTime } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'vaultCreationTime',
    args: resolvedVaultAddress ? [resolvedVaultAddress] : undefined,
    query: {
      enabled: !cardBoundMode && !!resolvedVaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.PanicGuard),
    }
  })
  
  const lastPanicTime = cardBoundMode ? 0 : lastPanic ? Number(lastPanic) : 0
  const creationTime = cardBoundMode ? 0 : vaultCreationTime ? Number(vaultCreationTime) : 0
  
  const COOLDOWN = cardBoundMode ? 0 : 24 * 3600
  const MIN_AGE = cardBoundMode ? 0 : 3600
  
  return {
    vaultAddress: resolvedVaultAddress,
    lastPanicTime,
    creationTime,
    cooldownSeconds: COOLDOWN,
    minAgeSeconds: MIN_AGE,
    isPaused: !!paused,
    isLoading: cardBoundMode ? isLoadingPaused : isLoadingLastPanic || isLoadingCreationTime,
  }
}

/**
 * Self-panic: Lock your own vault immediately
 * NOTE: Returns isAvailable=false if PanicGuard is not deployed
 */
export function useSelfPanic() {
  const cardBoundMode = isCardBoundVaultMode()
  const { address } = useAccount()
  const { writeContract, data, isPending } = useWriteContract()

  const { data: vaultAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: { enabled: cardBoundMode && !!address },
  })
  const resolvedVaultAddress = vaultAddress as `0x${string}` | undefined

  const { data: paused } = useReadContract({
    address: resolvedVaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: { enabled: cardBoundMode && !!resolvedVaultAddress },
  })
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const isAvailable = cardBoundMode
    ? !!resolvedVaultAddress && !paused
    : isConfiguredContractAddress(CONTRACT_ADDRESSES.PanicGuard)
  
  const selfPanic = (durationHours: number = 24) => {
    if (!isAvailable) {
      if (process.env.NODE_ENV === 'development') {
        logger.error(cardBoundMode ? 'Vault is unavailable or already paused - selfPanic unavailable' : 'PanicGuard contract not deployed - selfPanic unavailable')
      }
      return
    }

    if (cardBoundMode && resolvedVaultAddress) {
      writeContract({
        address: resolvedVaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'pause',
      })
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
    isAvailable,
    supportsDuration: !cardBoundMode,
  }
}

/**
 * Get vault guardians list and threshold
 */
export function useVaultGuardians(vaultAddress?: `0x${string}`) {
  const cardBoundMode = isCardBoundVaultMode()

  const { data: guardianCount } = useReadContract({
    address: cardBoundMode ? vaultAddress : CONTRACT_ADDRESSES.GuardianRegistry,
    abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : GuardianRegistryABI,
    functionName: 'guardianCount',
    args: cardBoundMode ? undefined : vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: cardBoundMode ? !!vaultAddress : !!vaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianRegistry),
    }
  })
  
  const { data: threshold } = useReadContract({
    address: cardBoundMode ? vaultAddress : CONTRACT_ADDRESSES.GuardianRegistry,
    abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : GuardianRegistryABI,
    functionName: cardBoundMode ? 'guardianThreshold' : 'guardiansNeeded',
    args: cardBoundMode ? undefined : vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: cardBoundMode ? !!vaultAddress : !!vaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianRegistry),
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
  const cardBoundMode = isCardBoundVaultMode()

  const { data: isGuardian } = useReadContract({
    address: cardBoundMode ? vaultAddress : CONTRACT_ADDRESSES.GuardianRegistry,
    abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : GuardianRegistryABI,
    functionName: 'isGuardian',
    args: cardBoundMode
      ? guardianAddress ? [guardianAddress] : undefined
      : vaultAddress && guardianAddress ? [vaultAddress, guardianAddress] : undefined,
    query: {
      enabled: cardBoundMode
        ? !!vaultAddress && !!guardianAddress
        : !!vaultAddress && !!guardianAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianRegistry),
    }
  })
  
  return isGuardian || false
}

/**
 * Get guardian lock status and approval count
 */
export function useGuardianLockStatus(vaultAddress?: `0x${string}`) {
  const cardBoundMode = isCardBoundVaultMode()

  const { data: paused } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: {
      enabled: cardBoundMode && !!vaultAddress,
    }
  })

  const { data: locked } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: GuardianLockABI,
    functionName: 'locked',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !cardBoundMode && !!vaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianLock),
    }
  })
  
  const { data: approvals } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: GuardianLockABI,
    functionName: 'approvals',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !cardBoundMode && !!vaultAddress && isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianLock),
    }
  })
  
  return {
    isLocked: cardBoundMode ? !!paused : locked || false,
    approvals: cardBoundMode ? 0 : approvals ? Number(approvals) : 0,
  }
}

/**
 * Cast guardian lock vote
 */
export function useCastGuardianLock(vaultAddress: `0x${string}`) {
  const cardBoundMode = isCardBoundVaultMode()
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const castLock = (reason: string = 'Security concern') => {
    if (cardBoundMode) {
      writeContract({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'pause',
      })
      return
    }

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
  const cardBoundMode = isCardBoundVaultMode()

  const { data: halted, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.EmergencyBreaker,
    abi: EmergencyBreakerABI,
    functionName: 'halted',
    query: {
      enabled: !cardBoundMode && isConfiguredContractAddress(CONTRACT_ADDRESSES.EmergencyBreaker),
      refetchInterval: 10000, // Check every 10 seconds
    }
  })
  
  const { data: globalRisk } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: PanicGuardABI,
    functionName: 'globalRisk',
    query: {
      enabled: !cardBoundMode && isConfiguredContractAddress(CONTRACT_ADDRESSES.PanicGuard),
      refetchInterval: 10000,
    }
  })
  
  return {
    isHalted: cardBoundMode ? false : halted || false,
    isGlobalRisk: cardBoundMode ? false : globalRisk || false,
    isEmergency: cardBoundMode ? false : halted || globalRisk || false,
    refetch: refetch ?? (() => Promise.resolve()),
  }
}
