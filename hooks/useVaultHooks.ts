'use client'

/**
 * Vault hooks — minimal surface kept after dead-code surgery.
 *
 * The pre-cleanup file was 758 lines and exported 17 hooks, most of
 * which were legacy non-CardBound UserVault helpers (balance snapshot
 * mode, abnormal-tx threshold, pending-tx queue approve/execute/cleanup,
 * setGuardian, transferVFIDE, guardian-cancel-inheritance,
 * inheritance-status, guardian-maturity reads). Every legacy hook either:
 *   (a) had `enabled: false` queries that never fired,
 *   (b) threw or returned an error unconditionally because the active
 *       vault is CardBound, or
 *   (c) had zero consumers across the codebase.
 *
 * Kept: `useUserVault` (vault-of lookup) and `useVaultBalance` (token
 * balance + Zustand sync). Both are CardBound-clean.
 *
 * For createVault, transfers, guardian setup, and recovery operations,
 * use `useVaultHub`, `useVaultRecovery`, and `useVaultOperations` —
 * which are CardBound-native by design.
 */

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { useEffect, useState } from 'react'
import { ACTIVE_VAULT_IMPLEMENTATION, isConfiguredContractAddress } from '../lib/contracts'
import { useContractAddresses } from './useContractAddresses'
import { ZERO_ADDRESS } from '../lib/constants'
import { VaultHubABI, VFIDETokenABI, CardBoundVaultABI } from '../lib/abis'
import { isCardBoundVaultMode } from '../lib/contracts'
import { useAppStore } from '@/lib/store/appStore';

const HUB_ABI = VaultHubABI

export function useUserVault() {
  const CONTRACT_ADDRESSES = useContractAddresses();
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

// Note: vault creation lives in `useVaultHub` (createVault) and operates
// on the same VaultHub.ensureVault() entrypoint as the legacy hook used
// to. There's no callsite for a second creator hook here.

export function useVaultBalance() {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { vaultAddress } = useUserVault()
  const setVault = useAppStore((state) => state.setVault)
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

  // Note: CardBoundVault uses a withdrawal queue (see useVaultOperations
  // queuedWithdrawals state) rather than the legacy `pendingTransactions`
  // array. The pre-cleanup version of this hook batched reads of
  // pendingTransactions[i] to compute a locked-balance figure, all gated
  // by `enabled: false`. That dead batch was removed; locked balance is
  // now tracked via the withdrawal queue surface instead.
  const formattedBalance = balance ? formatEther(balance as bigint) : '0';

  // Sync with Zustand store for global state access
  useEffect(() => {
    if (vaultAddress && balance !== undefined) {
      setVault({
        address: vaultAddress,
        balance: formattedBalance,
        lockedBalance: '0',
        lastUpdated: Date.now(),
      });
    }
  }, [vaultAddress, balance, formattedBalance, setVault]);

  return {
    balance: formattedBalance,
    balanceRaw: (balance as bigint) || 0n,
    lockedBalance: '0',
    lockedBalanceRaw: 0n,
    isLoading,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useGuardianCancelInheritance
// Allows a guardian to veto (cancel) an active inheritance claim on a vault.
// In the CardBound flow this maps to vetoInheritanceClaim().
// ---------------------------------------------------------------------------
export function useGuardianCancelInheritance(vaultAddress?: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({ hash: txHash })

  async function cancelInheritance(): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress!,
        abi: CardBoundVaultABI,
        functionName: 'vetoInheritanceClaim',
        args: [],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return { cancelInheritance, isLoading, isSuccess }
}

// ---------------------------------------------------------------------------
// useInheritanceStatus
// Reads next-of-kin style inheritance status from a vault. In CardBound mode
// the vault uses the InheritanceManager multi-heir system, so legacy
// next-of-kin fields are meaningless — hasNextOfKin always returns false.
// ---------------------------------------------------------------------------
export function useInheritanceStatus(vaultAddress?: `0x${string}`) {
  const isCardBound = isCardBoundVaultMode()

  const { data } = useReadContract({
    address: vaultAddress,
    abi: CardBoundVaultABI,
    functionName: 'vaultAdmin',
    query: { enabled: !!vaultAddress && !isCardBound },
  })

  const nextOfKin = isCardBound
    ? ZERO_ADDRESS
    : (data as string | undefined) ?? ZERO_ADDRESS

  return {
    nextOfKin,
    hasNextOfKin: nextOfKin !== ZERO_ADDRESS && nextOfKin !== '0x0000000000000000000000000000000000000000',
  }
}

