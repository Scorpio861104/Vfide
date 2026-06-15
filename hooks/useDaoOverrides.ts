'use client';

/**
 * useDaoOverrides — reads the PUBLIC DAO override ledger (Phase 2 transparency).
 * Anyone can audit the DAO's overrides of Seer decisions.
 */

import { useCallback, useEffect, useState } from 'react';

export interface DaoOverride {
  id: string;
  override_type: string;
  subject_identity: string | null;
  original_decision: string;
  override_decision: string;
  reason: string;
  proposal_ref: string | null;
  votes_for: number | null;
  votes_against: number | null;
  recorded_by: string;
  impact: string | null;
  created_at: string;
}

export function useDaoOverrides(filter?: { type?: string; subject?: string }) {
  const [overrides, setOverrides] = useState<DaoOverride[]>([]);
  const [summary, setSummary] = useState<{ override_type: string; n: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter?.type) qs.set('type', filter.type);
      if (filter?.subject) qs.set('subject', filter.subject);
      const res = await fetch(`/api/dao/overrides${qs.toString() ? `?${qs}` : ''}`, { credentials: 'include' });
      if (!res.ok) { setOverrides([]); setSummary([]); return; }
      const data = await res.json();
      setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
      setSummary(Array.isArray(data.summary) ? data.summary : []);
    } catch {
      setOverrides([]); setSummary([]);
    } finally {
      setLoading(false);
    }
  }, [filter?.type, filter?.subject]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { overrides, summary, loading, refresh };
}
