'use client';

/**
 * useMerchantVerification (Wave 49-B) — real, criteria-based merchant verification status.
 *
 * Reads GET /api/merchant/verification (status + per-criterion progress) and exposes a `check()`
 * that POSTs to re-evaluate and grant verification when the criteria are met (which also emits the
 * MERCHANT_VERIFIED ecosystem event server-side). No gatekeeper — verification reflects real
 * activity (complete profile + real confirmed payments).
 */

import { useCallback, useEffect, useState } from 'react';
import { useEmitEvent } from '@/lib/events/EventProvider';

export interface VerificationCriterion {
  id: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface MerchantVerification {
  verified: boolean;
  verifiedAt: string | null;
  criteria: VerificationCriterion[];
  /** All criteria met (eligible to be granted, if not already). */
  eligible: boolean;
  loading: boolean;
  error: string | null;
  /** Re-evaluate and grant if eligible. Returns true if newly verified. */
  check: () => Promise<boolean>;
}

interface ApiState {
  verified: boolean;
  verified_at: string | null;
  criteria: VerificationCriterion[];
  newly_verified?: boolean;
}

export function useMerchantVerification(): MerchantVerification {
  const emitEvent = useEmitEvent();
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant/verification', { credentials: 'include' });
      if (!res.ok) {
        // Unauthenticated or no profile yet — treat as unverified, not an error to shout about.
        setState(null);
        return;
      }
      const data: ApiState = await res.json();
      setState(data);
    } catch {
      setError('Could not load verification status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const check = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/merchant/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data: ApiState = await res.json();
      setState(data);
      if (data.newly_verified) {
        // Mirror the server event onto the live client bus so the Nexus/timeline react immediately.
        emitEvent('MERCHANT_VERIFIED', undefined, 'verification-check');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [emitEvent]);

  const criteria = state?.criteria ?? [];
  return {
    verified: state?.verified ?? false,
    verifiedAt: state?.verified_at ?? null,
    criteria,
    eligible: criteria.length > 0 && criteria.every((c) => c.met),
    loading,
    error,
    check,
  };
}
