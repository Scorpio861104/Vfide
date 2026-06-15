'use client';

/**
 * useMerchantAdvisor — reads GET /api/merchant/advisor (Commerce Health + advisor signals from real
 * merchant data). Advisory only; never changes prices, inventory, or funds.
 */

import { useCallback, useEffect, useState } from 'react';
import type { MerchantAdvisorResult } from '@/lib/seer/merchantAdvisor';

export function useMerchantAdvisor() {
  const [advisor, setAdvisor] = useState<MerchantAdvisorResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/advisor', { credentials: 'include' });
      if (!res.ok) { setAdvisor(null); return; }
      const data = await res.json();
      setAdvisor(data.advisor ?? null);
    } catch {
      setAdvisor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { advisor, loading, refresh };
}
