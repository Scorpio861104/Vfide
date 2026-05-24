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
    toast({ title: message, variant: 'default' });
  }, []);

  const toastSuccess = useCallback((message: string, txHash?: string) => {
    const explorerUrl = txHash ? `${EXPLORER_BASE}/tx/${txHash}` : undefined;
    toast({
      title: message,
      description: explorerUrl
        ? `View on explorer →`
        : undefined,
      variant: 'success',
      action: explorerUrl
        ? { label: 'View', onClick: () => window.open(explorerUrl, '_blank') }
        : undefined,
    });
  }, []);

  const toastError = useCallback((message: string, error?: unknown) => {
    const detail = error instanceof Error ? error.message : String(error ?? '');
    toast({
      title: message,
      description: detail.slice(0, 120) || undefined,
      variant: 'destructive',
    });
  }, []);

  return { toastPending, toastSuccess, toastError };
}
