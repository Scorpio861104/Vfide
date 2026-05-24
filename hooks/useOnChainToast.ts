/**
 * useOnChainToast — standardized toast notifications for on-chain actions.
 *
 * Eliminates the inconsistency where some write transactions show a success
 * toast with an explorer link and others complete silently.
 *
 * Usage:
 *   const { toastPending, toastSuccess, toastError } = useOnChainToast();
 *
 *   toastPending('Submitting transfer…');
 *   toastSuccess('Transfer sent', txHash);
 *   toastError('Transfer failed', err);
 */
'use client';

import { useCallback } from 'react';
import { toast } from '@/lib/toast';

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://basescan.org';

export function useOnChainToast() {
  const toastPending = useCallback((message: string) => {
    toast.info(message);
  }, []);

  const toastSuccess = useCallback((message: string, txHash?: string) => {
    const explorerUrl = txHash ? `${EXPLORER_BASE}/tx/${txHash}` : undefined;
    const detail = explorerUrl ? `${message} — View: ${explorerUrl}` : message;
    toast.success(detail);
  }, []);

  const toastError = useCallback((message: string, error?: unknown) => {
    const detail = error instanceof Error ? error.message : String(error ?? '');
    const full = detail ? `${message}: ${detail.slice(0, 120)}` : message;
    toast.error(full);
  }, []);

  return { toastPending, toastSuccess, toastError };
}
