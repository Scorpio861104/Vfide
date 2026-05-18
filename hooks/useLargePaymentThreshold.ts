'use client';

/**
 * useLargePaymentThreshold
 *
 * Reads the current large-payment threshold from the CardBoundVaultPaymentQueueManager
 * and exposes a write to propose a new threshold (timelocked).
 *
 * Backlog item: Phase 2 Turn 1 — Wire setLargePaymentThreshold propose UI in vault settings.
 *
 * The payment-queue manager requires large payments (above the threshold) to sit
 * in a queue for WITHDRAWAL_DELAY seconds before execution. Raising this threshold
 * means more payments flow instantly; lowering it adds friction for larger amounts.
 *
 * Contract flow:
 *   1. Vault owner calls vault.setLargePaymentThreshold(threshold, delay)
 *      → vault delegates to paymentQueueManager.setLargePaymentThreshold(...)
 *   2. After `delay` seconds, anyone calls vault.applyLargePaymentThreshold()
 *      → vault delegates to paymentQueueManager.applyLargePaymentThreshold()
 *   3. Optionally cancel before delay expires via vault.cancelLargePaymentThreshold()
 *      → delegates to paymentQueueManager.cancelLargePaymentThreshold() [added R77]
 *
 * The /vault/pending-changes page handles apply + cancel via usePendingChanges.
 * This hook is for the initial "propose new threshold" step only.
 */

import { useCallback, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address, parseUnits } from 'viem';
import { ACTIVE_VAULT_ABI, CONTRACT_ADDRESSES, isConfiguredContractAddress, ZERO_ADDRESS } from '@/lib/contracts';
import { CardBoundVaultPaymentQueueManagerABI } from '@/lib/abis';

/** Minimum timelock delay in seconds (1 hour). The vault enforces this. */
export const MIN_THRESHOLD_DELAY_SECONDS = 3600;
/** Maximum timelock delay in seconds (7 days). Sane UI cap. */
export const MAX_THRESHOLD_DELAY_SECONDS = 7 * 24 * 3600;

export function useLargePaymentThreshold(vaultAddress: Address | undefined) {
  const { address } = useAccount();

  const enabled = !!vaultAddress && vaultAddress !== ZERO_ADDRESS;

  // ─── Read: paymentQueueManager address from vault ──────────────────────────
  const { data: pqmAddressRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI as any,
    functionName: 'paymentQueueManager',
    query: { enabled },
  });
  const pqmAddress = (pqmAddressRaw as Address | undefined) ?? ZERO_ADDRESS;
  const pqmEnabled = enabled && !!pqmAddress && pqmAddress !== ZERO_ADDRESS;

  // ─── Read: current threshold ────────────────────────────────────────────────
  const {
    data: currentThresholdRaw,
    isLoading: isReadLoading,
    refetch: refetchThreshold,
  } = useReadContract({
    address: pqmAddress as Address,
    abi: CardBoundVaultPaymentQueueManagerABI as any,
    functionName: 'largePaymentThreshold',
    query: { enabled: pqmEnabled },
  });
  const currentThreshold = (currentThresholdRaw as bigint | undefined) ?? 0n;

  // ─── Read: pending change ───────────────────────────────────────────────────
  const { data: pendingChangeRaw, refetch: refetchPending } = useReadContract({
    address: pqmAddress as Address,
    abi: CardBoundVaultPaymentQueueManagerABI as any,
    functionName: 'pendingLargePaymentThresholdChange',
    query: { enabled: pqmEnabled },
  });
  const pendingChange = pendingChangeRaw as
    | { threshold: bigint; executeAfter: bigint }
    | undefined;
  const hasPending = !!pendingChange && pendingChange.executeAfter > 0n;

  // ─── Write: propose new threshold ──────────────────────────────────────────
  const {
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
    data: txHash,
    reset: resetWrite,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [proposeError, setProposeError] = useState<string | null>(null);

  /**
   * propose — call vault.setLargePaymentThreshold(threshold, delay)
   *
   * @param thresholdWei  New threshold in wei (bigint)
   * @param delaySeconds  Timelock delay in seconds (number)
   */
  const propose = useCallback(
    async (thresholdWei: bigint, delaySeconds: number) => {
      if (!vaultAddress) throw new Error('No vault address');
      if (delaySeconds < MIN_THRESHOLD_DELAY_SECONDS) {
        throw new Error(
          `Delay must be at least ${MIN_THRESHOLD_DELAY_SECONDS / 3600}h`
        );
      }
      setProposeError(null);
      try {
        await writeContractAsync({
          address: vaultAddress,
          abi: ACTIVE_VAULT_ABI as any,
          functionName: 'setLargePaymentThreshold',
          args: [thresholdWei, BigInt(delaySeconds)],
        });
        setTimeout(() => {
          refetchThreshold();
          refetchPending();
        }, 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Propose failed';
        setProposeError(msg);
        throw err;
      }
    },
    [vaultAddress, writeContractAsync, refetchThreshold, refetchPending]
  );

  return {
    currentThreshold,
    hasPending,
    pendingChange,
    isReadLoading,
    propose,
    isWritePending,
    isConfirming,
    isConfirmed,
    proposeError: proposeError ?? writeError?.message ?? null,
    txHash: txHash ?? null,
    resetWrite,
  };
}
