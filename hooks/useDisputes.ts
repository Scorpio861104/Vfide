'use client';

/**
 * useDisputes — read + act on the caller's disputes (Fraud & Abuse engine).
 * Non-custodial: opening/resolving a dispute records and notifies; it never moves or holds funds.
 */

import { useCallback, useEffect, useState } from 'react';

export interface Dispute {
  id: string;
  opener_address: string;
  respondent_address: string;
  tx_hash: string | null;
  order_id: string | null;
  reason: string;
  detail: string | null;
  status: 'open' | 'responded' | 'resolved_refunded' | 'resolved_settled' | 'resolved_upheld' | 'withdrawn';
  merchant_response: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  role: 'opener' | 'respondent';
}

export function useDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/disputes', { credentials: 'include' });
      if (!res.ok) {
        setDisputes([]);
        return;
      }
      const data = (await res.json()) as { disputes?: Dispute[] };
      setDisputes(Array.isArray(data.disputes) ? data.disputes : []);
    } catch {
      setError('Could not load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  const act = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      try {
        const res = await fetch('/api/disputes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await refresh();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  const openDispute = useCallback(
    (respondent_address: string, reason: string, opts?: { detail?: string; tx_hash?: string; order_id?: string }) =>
      act({ action: 'open', respondent_address, reason, ...opts }),
    [act],
  );
  const respond = useCallback((id: string, merchant_response: string) => act({ action: 'respond', id, merchant_response }), [act]);
  const resolve = useCallback(
    (id: string, outcome: 'refunded' | 'settled' | 'upheld', resolution_note?: string) =>
      act({ action: 'resolve', id, outcome, resolution_note }),
    [act],
  );
  const withdraw = useCallback((id: string) => act({ action: 'withdraw', id }), [act]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { disputes, loading, error, refresh, openDispute, respond, resolve, withdraw };
}
