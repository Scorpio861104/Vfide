'use client';

import { useCallback } from 'react';
import { useAppLock } from '@/components/security/AppLockProvider';

/**
 * Convenience hook for use in write-call sites (e.g. payment submit, vault
 * withdraw). Wraps the AppLockProvider's requestUnlock.
 *
 * Usage:
 *   const requireUnlock = useRequireAppLock();
 *   const onPay = async (amount: bigint) => {
 *     const ok = await requireUnlock(amount, 'Payment to merchant XYZ');
 *     if (!ok) return; // user cancelled or failed
 *     await writeContractAsync({ ... });
 *   };
 *
 * Returns true when:
 *   - AppLock is disabled or no methods configured, OR
 *   - amount is below the configured threshold, OR
 *   - an unlock session is already active, OR
 *   - the user successfully verified via biometric or PIN.
 *
 * Returns false when the user cancelled the modal or hit the lockout limit.
 *
 * It is safe to call this hook even before AppLock has been configured —
 * the provider returns true immediately when nothing is set up.
 */
export function useRequireAppLock() {
  const { requestUnlock } = useAppLock();

  return useCallback(
    (amount: bigint, label?: string): Promise<boolean> => requestUnlock(amount, label),
    [requestUnlock],
  );
}
