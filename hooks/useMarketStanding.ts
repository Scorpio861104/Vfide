'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BuilderSummary, SuggestedLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';

export interface ExtractionSummary {
  index: number;
  category: string;
}

export interface MarketStanding {
  builder: BuilderSummary | null;
  extraction: ExtractionSummary | null;
  decision: Record<string, unknown> | null;
  lendingTerms: SuggestedLoanTerms | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketStanding(): MarketStanding {
  const [builder, setBuilder] = useState<BuilderSummary | null>(null);
  const [extraction, setExtraction] = useState<ExtractionSummary | null>(null);
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null);
  const [lendingTerms, setLendingTerms] = useState<SuggestedLoanTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seer/market-standing', { credentials: 'include' });
      if (!res.ok) {
        setBuilder(null);
        setExtraction(null);
        setDecision(null);
        setLendingTerms(null);
        return;
      }

      const data = (await res.json()) as {
        builder?: BuilderSummary;
        extraction?: ExtractionSummary;
        decision?: Record<string, unknown>;
        lendingTerms?: SuggestedLoanTerms;
      };

      setBuilder(data.builder ?? null);
      setExtraction(data.extraction ?? null);
      setDecision(data.decision ?? null);
      setLendingTerms(data.lendingTerms ?? null);
    } catch {
      setError('Could not load your market standing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { builder, extraction, decision, lendingTerms, loading, error, refresh };
}
