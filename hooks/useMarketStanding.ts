'use client';

/**
 * useMarketStanding (Whale Protection — real-data wiring).
 *
 * Reads GET /api/seer/market-standing, which computes the participant's Builder Record, Extraction
 * Index (from real indexed Transfer history, persisted with decay), and the discretionary Stability
 * Policy decision. Feeds MarketStandingPanel. Read-only — reflects behavior, controls nothing.
 */

import { useCallback, useEffect, useState } from 'react';
import type { BuilderResult } from '@/lib/seer/marketStability/builderRecord';
import type { ExtractionResult } from '@/lib/seer/marketStability/extractionIndex';
import type { StabilityDecision } from '@/lib/seer/marketStability/stabilityPolicy';
import type { SuggestedLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';

export interface MarketStanding {
  builder: BuilderResult | null;
  extraction: ExtractionResult | null;
  decision: StabilityDecision | null;
  lendingTerms: SuggestedLoanTerms | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketStanding(): MarketStanding {
  const [builder, setBuilder] = useState<BuilderResult | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [decision, setDecision] = useState<StabilityDecision | null>(null);
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
      const data = await res.json();
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
