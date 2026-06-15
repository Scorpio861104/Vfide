'use client';

/**
 * useMerchantHQ — surfaces the Merchant HQ intelligence (Wave 75 cohesion wiring).
 *
 * Reads GET /api/merchant/hq, the aggregation that composes Merchant Health, Builder Record, Extraction,
 * Lending, Trust, Continuity/Recovery, and the structured Opportunity Center + Risk Center (each entry
 * cause → effect → action/mitigation). Until this hook, that payload had no UI consumer — the intelligence
 * was backend-only. Read-only; reflects state, controls nothing.
 */

import { useCallback, useEffect, useState } from 'react';

export interface HQOpportunity { signal: string; cause: string; effect: string; action: string }
export interface HQRisk { signal: string; level: 'low' | 'medium' | 'high'; cause: string; effect: string; mitigation: string }

export interface HQHealthComponent { name: string; weight: number; value: number | null; contribution: number }

export interface MerchantHQData {
  health: { score: number | null; band: string; topRecommendation: string; components: HQHealthComponent[] } | null;
  builder: { score: number; classification: string; opportunities: string[] } | null;
  lending: { eligible: boolean; suggestedLimitVfide: number; action: string } | null;
  opportunityCenter: HQOpportunity[];
  riskCenter: HQRisk[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMerchantHQ(enabled: boolean): MerchantHQData {
  const [data, setData] = useState<Omit<MerchantHQData, 'loading' | 'error' | 'refresh'>>({
    health: null, builder: null, lending: null, opportunityCenter: [], riskCenter: [],
  });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant/hq', { credentials: 'include' });
      if (!res.ok) {
        // 401 (not a merchant / not signed in) is an expected state, not an error to shout about.
        if (res.status === 401) { setData({ health: null, builder: null, lending: null, opportunityCenter: [], riskCenter: [] }); return; }
        throw new Error(`HQ ${res.status}`);
      }
      const json = await res.json();
      setData({
        health: json.health ? {
          score: json.health.score ?? null,
          band: json.health.band ?? 'provisional',
          topRecommendation: json.health.topRecommendation ?? '',
          components: Array.isArray(json.health.components) ? json.health.components : [],
        } : null,
        builder: json.builder ?? null,
        lending: json.lending ?? null,
        opportunityCenter: Array.isArray(json.opportunityCenter) ? json.opportunityCenter : [],
        riskCenter: Array.isArray(json.riskCenter) ? json.riskCenter : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load HQ');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ...data, loading, error, refresh };
}
