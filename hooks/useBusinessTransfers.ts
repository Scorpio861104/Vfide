'use client';

/**
 * useBusinessTransfers (Wave 95) — surfaces the business-transfer flow that was previously API-only.
 *
 * Reads /api/merchant/business-transfer (transfers where the caller is owner or successor) and exposes the
 * owner-protection actions: VETO an emergency transfer (owner OR the designated proof-of-life address — CID-2)
 * and RECLAIM an already-executed emergency transfer within its window (owner only — Wave 89).
 *
 * This is the "owner returns" surface for business continuity: it makes the veto/reclaim windows visible and
 * actionable instead of buried in the API. It does not initiate transfers (successors/operators do that); it
 * gives the owner the levers to stop or reverse one.
 */

import { useCallback, useEffect, useState } from 'react';

export interface BusinessTransfer {
  id: string;
  kind: string;             // 'voluntary' | 'emergency'
  status: string;           // 'pending' | 'executed' | 'vetoed' | 'cancelled' | 'reclaimed' | ...
  from_address: string;
  to_address: string;
  role: 'owner' | 'successor';
  veto_until: string | null;
  reclaim_until: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseBusinessTransfers {
  transfers: BusinessTransfer[];
  loading: boolean;
  error: string | null;
  veto: (id: string) => Promise<boolean>;
  reclaim: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useBusinessTransfers(): UseBusinessTransfers {
  const [transfers, setTransfers] = useState<BusinessTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant/business-transfer', { credentials: 'include' });
      if (!res.ok) { setTransfers([]); return; }
      const data: { transfers?: BusinessTransfer[] } = await res.json();
      setTransfers(Array.isArray(data.transfers) ? data.transfers : []);
    } catch {
      setError('Could not load business transfers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const act = useCallback(async (action: string, id: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/merchant/business-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const veto = useCallback((id: string) => act('veto', id), [act]);
  const reclaim = useCallback((id: string) => act('reclaim', id), [act]);

  return { transfers, loading, error, veto, reclaim, refresh };
}
