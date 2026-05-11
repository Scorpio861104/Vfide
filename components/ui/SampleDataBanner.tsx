'use client';

import { FlaskConical } from 'lucide-react';

/**
 * SampleDataBanner — displayed on any tab that renders demonstrative/static data
 * rather than live on-chain data. Replace with live data when the backing
 * API / indexer is connected.
 */
export function SampleDataBanner({ label = 'Live data unavailable in this environment. Displayed values are illustrative only.' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 mb-4">
      <FlaskConical size={13} className="shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
