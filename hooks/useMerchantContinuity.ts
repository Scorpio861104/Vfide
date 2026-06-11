'use client';

/**
 * useMerchantContinuity (Wave 50) — real, merchant-scoped business continuity.
 *
 * Reads /api/merchant/continuity (readiness + succession + operators) and exposes actions to
 * designate a successor, clear it, and grant/revoke emergency operators. Mirrors the relevant
 * ecosystem events onto the live client bus so the Nexus/timeline react immediately; the server also
 * persists them durably.
 *
 * This is BUSINESS continuity (who runs/takes over the store), distinct from PERSONAL continuity
 * (vault heirs). It records designations + readiness; it does not itself execute an ownership handoff.
 */

import { useCallback, useEffect, useState } from 'react';
import { useEmitEvent } from '@/lib/events/EventProvider';

export interface ReadinessItem { id: string; label: string; met: boolean; detail: string }
export interface SuccessionInfo { successor_address: string; note: string | null; configured_at: string }
export interface OperatorInfo { id: string; operator_address: string; role: string; note: string | null; granted_at: string }

interface ContinuityState {
  succession: SuccessionInfo | null;
  operators: OperatorInfo[];
  readiness: ReadinessItem[];
  ready: boolean;
}

export interface MerchantContinuity extends ContinuityState {
  loading: boolean;
  error: string | null;
  setSuccessor: (address: string, note?: string) => Promise<boolean>;
  clearSuccessor: () => Promise<boolean>;
  grantOperator: (address: string, role?: string, note?: string) => Promise<boolean>;
  revokeOperator: (address: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const EMPTY: ContinuityState = { succession: null, operators: [], readiness: [], ready: false };

export function useMerchantContinuity(): MerchantContinuity {
  const emitEvent = useEmitEvent();
  const [state, setState] = useState<ContinuityState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant/continuity', { credentials: 'include' });
      if (!res.ok) {
        setState(EMPTY);
        return;
      }
      const data: ContinuityState = await res.json();
      setState(data);
    } catch {
      setError('Could not load business continuity status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const post = useCallback(async (payload: Record<string, unknown>): Promise<ContinuityState | null> => {
    try {
      const res = await fetch('/api/merchant/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data: ContinuityState = await res.json();
      setState(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const setSuccessor = useCallback(async (address: string, note?: string) => {
    const data = await post({ action: 'set_succession', successor_address: address, note });
    if (data) { emitEvent('MERCHANT_SUCCESSION_CONFIGURED', undefined, 'merchant-continuity'); return true; }
    return false;
  }, [post, emitEvent]);

  const clearSuccessor = useCallback(async () => !!(await post({ action: 'clear_succession' })), [post]);

  const grantOperator = useCallback(async (address: string, role?: string, note?: string) => {
    const data = await post({ action: 'grant_operator', operator_address: address, role, note });
    if (data) { emitEvent('EMERGENCY_OPERATOR_ASSIGNED', undefined, 'merchant-continuity'); return true; }
    return false;
  }, [post, emitEvent]);

  const revokeOperator = useCallback(async (address: string) => !!(await post({ action: 'revoke_operator', operator_address: address })), [post]);

  return { ...state, loading, error, setSuccessor, clearSuccessor, grantOperator, revokeOperator, refresh };
}
