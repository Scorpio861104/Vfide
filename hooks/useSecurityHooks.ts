'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_VAULT_ABI, CARD_BOUND_VAULT_ABI, VAULT_HUB_ABI } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { logger } from '@/lib/logger';

// ============================================
// VAULT PAUSE HOOKS
// ============================================
// History: this file was originally the SecurityHub bridge. SecurityHub
// was removed in the non-custodial refactor (no third-party locks). The
// remaining hooks here all relate to the vault's own pause()/paused()
// surface — they are the user-controlled equivalent of what SecurityHub
// previously did via DAO-level locks.
//
// Removed in v19.13 cleanup (2026-05-19):
//   useIsVaultLocked        — pure stub returning false; was kept as a
//                             transitional shim during the SecurityHub
//                             removal, no consumer remains
//   useIsGuardian           — zero consumers; CardBoundVault has the
//                             selector exposed directly via wagmi if a
//                             component needs it
//   useGuardianLockStatus   — zero consumers, was a stub
//   useCastGuardianLock     — zero consumers, called vault.pause() but
//                             nothing wired it up
//   useEmergencyStatus      — zero consumers, hardcoded stub
//   useVaultGuardians       — only consumer was an orphan test for a
//                             deleted SecurityGuardianPanel component

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
 * Self-panic: Lock your own vault immediately.
 *
 * Calls `pause()` on the CardBoundVault. The pause is unconditional —
 * the vault stays paused until the owner explicitly unpauses it. The
 * `supportsDuration` flag returned below is therefore always `false`,
 * and the UI surfaces a static "manual unpause required" notice rather
 * than a duration picker.
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

  const selfPanic = () => {
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
    }
  }

  return {
    selfPanic,
    isPanicking: isPending || isConfirming,
    isSuccess,
    txHash: data,
    isAvailable,
    supportsDuration: false as const,
  }
}
