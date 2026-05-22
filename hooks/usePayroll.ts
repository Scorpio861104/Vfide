'use client';

/**
 * PayrollManager hooks.
 *
 * Wires every user-facing function of PayrollManager.sol. Replaces the
 * `/api/streams` REST stub that `app/payroll/*` previously used — the
 * REST endpoint had zero contract interaction, so streams created
 * through the UI never actually existed on chain.
 *
 * Streams are unidirectional, continuous transfers: payer locks
 * `initialDeposit` and a `rate` (tokens per second), and the payee can
 * `withdraw()` accrued funds at any time. Either side can adjust the
 * stream within constraints set in the contract (rate changes,
 * pause/resume, payee transfer via two-step propose/apply).
 *
 * Contract reverts we translate to readable errors:
 *   - PM_NotPayer       — caller isn't the stream's payer
 *   - PM_NotPayee       — caller isn't the stream's payee
 *   - PM_AlreadyPaused  / PM_NotPaused
 *   - PM_StreamEnded    — depositBalance == 0
 *   - PM_NothingToClaim
 *   - PM_BadAmount      / PM_BadRate
 *   - PM_PayeeUpdateNotReady / PM_PayeeUpdatePending
 *
 * The 7-day PAYEE_UPDATE_DELAY means updating payee is a two-step:
 * call `updatePayee(streamId, newPayee)` then wait, then call
 * `applyPayeeUpdate(streamId)`. The hook exposes both.
 *
 * Token allowance: createStream and topUp transfer from the payer via
 * the token's `transferFrom`, which requires prior `approve` to the
 * PayrollManager. The createStream hook orchestrates approve→create.
 */

'use client';

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Address, erc20Abi } from 'viem';
import { PayrollManagerABI } from '@/lib/abis';
import { isConfiguredContractAddress, getContractConfigurationError } from '@/lib/contracts';
import { useContractAddresses } from './useContractAddresses';

// ─── Types matching the Stream struct in PayrollManager.sol ────────────────
export interface Stream {
  payer: Address;
  payee: Address;
  token: Address;
  ratePerSecond: bigint;
  startTime: bigint;
  lastWithdrawTime: bigint;
  depositBalance: bigint;
  active: boolean;
  paused: boolean;
  pausedAt: bigint;
  pausedAccrued: bigint;
  expiryTime: bigint;
}

function parseStreamTuple(raw: unknown): Stream | null {
  if (!raw || typeof raw !== 'object') return null;
  // Viem decodes structs as objects with named fields when the ABI has them.
  const r = raw as Record<string, unknown>;
  if (typeof r.payer !== 'string') return null;
  return {
    payer: r.payer as Address,
    payee: r.payee as Address,
    token: r.token as Address,
    ratePerSecond: r.ratePerSecond as bigint,
    startTime: r.startTime as bigint,
    lastWithdrawTime: r.lastWithdrawTime as bigint,
    depositBalance: r.depositBalance as bigint,
    active: !!r.active,
    paused: !!r.paused,
    pausedAt: r.pausedAt as bigint,
    pausedAccrued: r.pausedAccrued as bigint,
    expiryTime: r.expiryTime as bigint};
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** List of stream IDs where the connected wallet is the payer. */
export function usePayerStreamIds(): { ids: bigint[]; isLoading: boolean; refetch: () => void } {
  const { PayrollManager } = useContractAddresses();
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: PayrollManager,
    abi: PayrollManagerABI,
    functionName: 'getPayerStreams',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfiguredContractAddress(PayrollManager) },
  });
  return {
    ids: (data as bigint[] | undefined) ?? [],
    isLoading,
    refetch};
}

/** List of stream IDs where the connected wallet is the payee. */
export function usePayeeStreamIds(): { ids: bigint[]; isLoading: boolean; refetch: () => void } {
  const { PayrollManager } = useContractAddresses();
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: PayrollManager,
    abi: PayrollManagerABI,
    functionName: 'getPayeeStreams',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfiguredContractAddress(PayrollManager) },
  });
  return {
    ids: (data as bigint[] | undefined) ?? [],
    isLoading,
    refetch};
}

/** Single stream by ID. */
export function useStream(streamId: bigint | undefined) {
  const { PayrollManager } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: PayrollManager,
    abi: PayrollManagerABI,
    functionName: 'getStream',
    args: streamId !== undefined ? [streamId] : undefined,
    query: {
      enabled: streamId !== undefined && isConfiguredContractAddress(PayrollManager),
    },
  });
  return {
    stream: parseStreamTuple(data),
    isLoading,
    refetch};
}

/** Currently-claimable amount for a stream (live accrual). */
export function useClaimable(streamId: bigint | undefined) {
  const { PayrollManager } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: PayrollManager,
    abi: PayrollManagerABI,
    functionName: 'claimable',
    args: streamId !== undefined ? [streamId] : undefined,
    query: {
      enabled: streamId !== undefined && isConfiguredContractAddress(PayrollManager),
    },
  });
  return {
    claimable: (data as bigint | undefined) ?? 0n,
    isLoading,
    refetch};
}

/** Batch-fetch many streams at once for the list views (saves N RPC calls). */
export function useStreamsBatch(ids: bigint[]) {
  const { PayrollManager } = useContractAddresses();
  const enabled = ids.length > 0 && isConfiguredContractAddress(PayrollManager);
  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? ids.map((id) => ({
          address: PayrollManager,
          abi: PayrollManagerABI as any,
          functionName: 'getStream',
          args: [id],
        } as const))
      : [],
    query: { enabled },
  });

  const streams: Array<{ id: bigint; stream: Stream | null }> = (data ?? [])
    .map((entry, i) => {
      const id = ids[i];
      if (id === undefined) return null;
      return {
        id,
        stream: entry?.status === 'success' ? parseStreamTuple(entry.result) : null,
      };
    })
    .filter((s): s is { id: bigint; stream: Stream | null } => s !== null);

  return { streams, isLoading, refetch };
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * createStream orchestrates the approve→createStream sequence. The
 * contract pulls `initialDeposit` from the payer at creation time
 * using transferFrom, which requires the payer to have approved
 * PayrollManager for at least that amount.
 */
export function useCreateStream() {
  const { PayrollManager } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  // Watch the submitted tx for inclusion. isLoading = confirming,
  // isSuccess = confirmed. Components gate refetch on isConfirmed
  // so the UI doesn't read stale state before the chain catches up.
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const createStream = useCallback(
    async (args: {
      payee: Address;
      token: Address;
      ratePerSecond: bigint;
      initialDeposit: bigint;
    }) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      if (args.ratePerSecond === 0n) throw new Error('Rate must be > 0');
      if (args.initialDeposit === 0n) throw new Error('Initial deposit must be > 0');

      // Step 1: approve the PayrollManager to pull `initialDeposit` from
      // the payer's balance. We always approve the exact amount needed
      // (no infinite approvals — keeps the attack surface bounded if the
      // contract is ever compromised).
      await writeContractAsync({
        address: args.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [PayrollManager, args.initialDeposit],
      });

      // Step 2: createStream. The contract emits StreamCreated; the UI
      // can refetch getPayerStreams after the tx receipt to see it.
      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'createStream',
        args: [args.payee, args.token, args.ratePerSecond, args.initialDeposit],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  return {
    createStream,
    isPending,
    isConfirming,
    isConfirmed,
    txHash: txHash ?? null,
    error: error as Error | null};
}

/** topUp adds more funds to an existing stream. Requires prior approve. */
export function useTopUpStream() {
  const { PayrollManager } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const topUp = useCallback(
    async (args: { streamId: bigint; token: Address; amount: bigint }) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      if (args.amount === 0n) throw new Error('Top-up amount must be > 0');

      await writeContractAsync({
        address: args.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [PayrollManager, args.amount],
      });

      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'topUp',
        args: [args.streamId, args.amount],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  return { topUp, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

/** Withdraw accrued funds (payee only). */
export function useWithdrawStream() {
  const { PayrollManager } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const withdraw = useCallback(
    async (streamId: bigint) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'withdraw',
        args: [streamId],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  return { withdraw, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

/** Pause / resume / cancel — payer-only state transitions. */
export function useStreamControls() {
  const { PayrollManager } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const requireConfigured = useCallback(() => {
    if (!isConfiguredContractAddress(PayrollManager)) {
      throw getContractConfigurationError('PayrollManager');
    }
  }, [PayrollManager]);

  const pauseStream = useCallback(async (streamId: bigint) => {
    requireConfigured();
    return writeContractAsync({
      address: PayrollManager,
      abi: PayrollManagerABI,
      functionName: 'pauseStream',
      args: [streamId],
    });
     
  }, [PayrollManager, writeContractAsync, requireConfigured]);

  const resumeStream = useCallback(async (streamId: bigint) => {
    requireConfigured();
    return writeContractAsync({
      address: PayrollManager,
      abi: PayrollManagerABI,
      functionName: 'resumeStream',
      args: [streamId],
    });
     
  }, [PayrollManager, writeContractAsync, requireConfigured]);

  const cancelStream = useCallback(async (streamId: bigint) => {
    requireConfigured();
    return writeContractAsync({
      address: PayrollManager,
      abi: PayrollManagerABI,
      functionName: 'cancelStream',
      args: [streamId],
    });
     
  }, [PayrollManager, writeContractAsync, requireConfigured]);

  const claimExpiredStream = useCallback(async (streamId: bigint) => {
    requireConfigured();
    return writeContractAsync({
      address: PayrollManager,
      abi: PayrollManagerABI,
      functionName: 'claimExpiredStream',
      args: [streamId],
    });
     
  }, [PayrollManager, writeContractAsync, requireConfigured]);

  return { pauseStream, resumeStream, cancelStream, claimExpiredStream, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

/**
 * Payee update is a two-step propose/apply with PAYEE_UPDATE_DELAY between.
 * Exposed as two separate functions plus cancel.
 */
export function usePayeeUpdate() {
  const { PayrollManager } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const proposePayeeUpdate = useCallback(
    async (streamId: bigint, newPayee: Address) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'updatePayee',
        args: [streamId, newPayee],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  const applyPayeeUpdate = useCallback(
    async (streamId: bigint) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'applyPayeeUpdate',
        args: [streamId],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  const cancelPayeeUpdate = useCallback(
    async (streamId: bigint) => {
      if (!isConfiguredContractAddress(PayrollManager)) {
        throw getContractConfigurationError('PayrollManager');
      }
      return writeContractAsync({
        address: PayrollManager,
        abi: PayrollManagerABI,
        functionName: 'cancelPayeeUpdate',
        args: [streamId],
      });
    },
    [PayrollManager, writeContractAsync],
  );

  return { proposePayeeUpdate, applyPayeeUpdate, cancelPayeeUpdate, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

// ─── Revert-message translation for UI toasts ──────────────────────────────

/**
 * Map a wagmi/viem error message to a user-friendly explanation.
 * Falls back to the raw shortMessage if nothing matches.
 */
export function translatePayrollError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PM_NotPayer'))         return 'Only the payer can do that.';
  if (msg.includes('PM_NotPayee'))         return 'Only the payee can do that.';
  if (msg.includes('PM_AlreadyPaused'))    return 'Stream is already paused.';
  if (msg.includes('PM_NotPaused'))        return 'Stream isn’t paused.';
  if (msg.includes('PM_StreamEnded'))      return 'Stream has no remaining balance.';
  if (msg.includes('PM_NothingToClaim'))   return 'Nothing to withdraw yet — wait for more to accrue.';
  if (msg.includes('PM_BadAmount'))        return 'Amount is invalid.';
  if (msg.includes('PM_BadRate'))          return 'Rate is invalid.';
  if (msg.includes('PM_PayeeUpdateNotReady'))  return 'Payee update is still in the timelock window.';
  if (msg.includes('PM_PayeeUpdatePending'))   return 'There’s already a pending payee update.';
  if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
    return 'Transaction cancelled.';
  }
  return msg.slice(0, 200);
}
